import {
  collectWithDescendants,
  createMoveNodeCommand,
  createSetNodeCommand,
  getParentOrigin,
  type MoveSnapshot,
} from "@open-canvas/commands";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { viewportStore } from "../../store/viewportStore";
import type { ArrowNode, LineNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import { findContainerAt } from "./containment";
import { computeGroupScale, getGroupBounds, getGroupHandles, hitTestGroupHandles, resizeNodeInGroup } from "./groupResize";
import type { Bounds } from "./groupResize";
import { hitTestScene } from "./hitTest";
import { marqueeSelectedIds } from "./marqueeSelection";
import { marqueeStore } from "./marqueeStore";
import { getResizeCursor } from "./resizeCursor";
import { getHandles, hitTestHandles } from "./resizeHandles";
import type { BBoxHandleId, EndpointHandleId, HandleId } from "./resizeHandles";
import { getAncestorLocalPoint, getBBoxLocalPoint, resizeBBoxNode, resizeEndpointNode } from "./resizeMath";
import { enterTextEdit } from "./textEdit";
import type { Tool, ToolPointerEvent } from "./toolTypes";

interface MoveDrag {
  kind: "move";
  startPoint: Point;
  snapshots: Map<NodeId, SceneNode>;
  startRootIds: NodeId[];
  // Containers whose children changed at some point during this gesture
  // (a node may pass through several frames before the drag ends), captured
  // pre-change so the undo command can restore them too. Mutated in place
  // by reparentDraggedNodes as the drag progresses.
  touchedContainers: Map<NodeId, SceneNode>;
}

interface ResizeDrag {
  kind: "resize";
  nodeId: NodeId;
  handleId: HandleId;
  startNode: SceneNode;
}

interface MarqueeDrag {
  kind: "marquee";
  startPoint: Point;
  // The selection to union marquee hits into (shift held) — captured once
  // at drag start, not re-read live, since by pointermove selectionStore
  // already holds this drag's own in-progress result.
  baseSelectedIds: Set<NodeId>;
  additive: boolean;
}

interface GroupResizeDrag {
  kind: "group-resize";
  handleId: BBoxHandleId;
  startBounds: Bounds;
  snapshots: Map<NodeId, SceneNode>;
  startRootIds: NodeId[];
}

type DragState = MoveDrag | ResizeDrag | MarqueeDrag | GroupResizeDrag;

let dragState: DragState | null = null;
let hoveredHandleId: HandleId | null = null;

function onPointerDown({ scenePoint, shiftKey }: ToolPointerEvent): void {
  const { selectedIds } = selectionStore.getState();

  const zoom = viewportStore.getState().zoom;

  if (selectedIds.size === 1) {
    const [soleId] = selectedIds;
    const groupMembers = getGroupMemberBounds(soleId, sceneStore.getState());
    if (groupMembers) {
      const handleId = hitTestGroupHandles(scenePoint, groupMembers.bounds, zoom);
      if (handleId) {
        startGroupResizeDrag(new Set(groupMembers.memberIds), groupMembers.bounds, handleId);
        return;
      }
    } else {
      const handleId = hitTestHandles(scenePoint, soleId, sceneStore.getState().nodes, zoom);
      if (handleId) {
        startResizeDrag(soleId, handleId);
        return;
      }
    }
  } else if (selectedIds.size > 1) {
    const bounds = getGroupBounds(selectedIds, sceneStore.getState().nodes);
    const handleId = bounds ? hitTestGroupHandles(scenePoint, bounds, zoom) : null;
    if (handleId && bounds) {
      startGroupResizeDrag(selectedIds, bounds, handleId);
      return;
    }
  }

  const scene = sceneStore.getState();
  const hitId = hitTestScene(scenePoint, scene);

  if (!hitId) {
    startMarqueeDrag(scenePoint, shiftKey, selectedIds);
    return;
  }

  const keepsExistingGroup = !shiftKey && selectedIds.has(hitId);
  if (!keepsExistingGroup) {
    const nextSelectedIds = shiftKey ? toggleId(selectedIds, hitId) : new Set([hitId]);
    selectionStore.update((state) => ({ ...state, selectedIds: nextSelectedIds }));
  }

  startMoveDrag(scenePoint);
}

// PointerEvent.detail isn't reliable for click-counting (unlike
// MouseEvent's, it's commonly 0 regardless of click count) — Canvas.tsx
// wires this to the native "dblclick" event instead, which the browser
// already resolves correctly.
function onDoubleClick({ scenePoint }: ToolPointerEvent): void {
  const scene = sceneStore.getState();
  const hitId = hitTestScene(scenePoint, scene);
  if (!hitId) return;

  const node = scene.nodes[hitId];
  if (node && node.type === "text" && !node.locked) {
    enterTextEdit(node, false);
  }
}

function onPointerMove({ scenePoint }: ToolPointerEvent): void {
  if (!dragState) {
    updateHoverState(scenePoint);
    return;
  }

  if (dragState.kind === "resize") {
    applyResize(dragState, scenePoint);
  } else if (dragState.kind === "group-resize") {
    applyGroupResize(dragState, scenePoint);
  } else if (dragState.kind === "marquee") {
    marqueeStore.update((state) => (state ? { ...state, current: scenePoint } : state));
    applyMarqueeSelection(dragState, scenePoint);
  } else {
    applyMove(dragState, scenePoint);
  }
}

function onPointerUp({ scenePoint }: ToolPointerEvent): void {
  // A pointermove doesn't always fire for the exact pixel a drag ends on
  // (e.g. the button is released without the pointer moving again first) —
  // resolve position/containment for that final position before committing,
  // but only if the pointer actually moved from where the drag started, or
  // a plain click would wrongly pick up a reference-changed "diff" from a
  // drag that never happened and get recorded as a no-op undo step.
  if (dragState?.kind === "move" && didMove(dragState, scenePoint)) {
    applyMove(dragState, scenePoint);
  }

  if (dragState?.kind === "group-resize") {
    applyGroupResize(dragState, scenePoint);
  }

  if (dragState?.kind === "marquee") {
    applyMarqueeSelection(dragState, scenePoint);
    marqueeStore.update(() => null);
  }

  if (dragState) commitDrag(dragState);
  dragState = null;
}

function didMove(drag: MoveDrag, scenePoint: Point): boolean {
  return scenePoint.x !== drag.startPoint.x || scenePoint.y !== drag.startPoint.y;
}

// The commit point: pointermove already wrote every intermediate frame of
// the drag straight to sceneStore for live feedback, so by pointerup the
// "after" state is just whatever's currently there. Bundling the whole
// gesture into one command here — instead of one per pointermove — is what
// makes a single Cmd+Z undo an entire drag, not one pixel of it.
function commitDrag(drag: DragState): void {
  if (drag.kind === "move") {
    commitMove(drag);
  } else if (drag.kind === "resize") {
    commitResize(drag);
  } else if (drag.kind === "group-resize") {
    commitGroupResize(drag);
  }
  // marquee: nothing to commit to history — selection has never been part
  // of the undo stack, same as a plain click-to-select.
}

function commitMove(drag: MoveDrag): void {
  // Containment/reparenting already happened live, per pointermove (see
  // reparentDraggedNodes) — this just gathers everything that changed
  // across the whole gesture (the moved nodes plus any container whose
  // children list changed at some point) into one undo command.
  const affectedBefore = new Map<NodeId, SceneNode>(drag.snapshots);
  for (const [id, node] of drag.touchedContainers) {
    if (!affectedBefore.has(id)) affectedBefore.set(id, node);
  }

  const finalScene = sceneStore.getState();
  const after = new Map<NodeId, SceneNode>();
  let changed = drag.startRootIds !== finalScene.rootIds;

  for (const [id, before] of affectedBefore) {
    const current = finalScene.nodes[id];
    if (!current) continue;
    after.set(id, current);
    if (current !== before) changed = true;
  }

  // A plain click (pointerdown then pointerup, no movement, no reparent)
  // never touches sceneStore, so nothing here differs from the snapshot —
  // skip recording a no-op undo step for it.
  if (!changed) return;

  const before: MoveSnapshot = { nodes: affectedBefore, rootIds: drag.startRootIds };
  const afterSnapshot: MoveSnapshot = { nodes: after, rootIds: finalScene.rootIds };
  historyManager.execute(createMoveNodeCommand(before, afterSnapshot));
}

function captureIfMissing(map: Map<NodeId, SceneNode>, scene: SceneGraph, id: NodeId | null): void {
  if (!id || map.has(id)) return;
  const node = scene.nodes[id];
  if (node) map.set(id, node);
}

function commitResize(drag: ResizeDrag): void {
  const current = sceneStore.getState().nodes[drag.nodeId];
  if (!current || current === drag.startNode) return;

  historyManager.execute(createSetNodeCommand(drag.nodeId, drag.startNode, current));
}

// Reuses MoveNodeCommand's before/after-map shape — it doesn't care why a
// set of nodes changed, only how to swap their full values, which is
// exactly what undoing a group resize needs too. rootIds never change here
// (no reparenting during a resize), so the same array serves both sides.
function commitGroupResize(drag: GroupResizeDrag): void {
  const finalNodes = sceneStore.getState().nodes;
  const after = new Map<NodeId, SceneNode>();
  let changed = false;

  for (const [id, before] of drag.snapshots) {
    const current = finalNodes[id];
    if (!current) continue;
    after.set(id, current);
    if (current !== before) changed = true;
  }

  if (!changed) return;

  const before: MoveSnapshot = { nodes: drag.snapshots, rootIds: drag.startRootIds };
  const afterSnapshot: MoveSnapshot = { nodes: after, rootIds: drag.startRootIds };
  historyManager.execute(createMoveNodeCommand(before, afterSnapshot));
}

function updateHoverState(scenePoint: Point): void {
  const { selectedIds } = selectionStore.getState();
  const zoom = viewportStore.getState().zoom;
  if (selectedIds.size === 1) {
    const [soleId] = selectedIds;
    const groupMembers = getGroupMemberBounds(soleId, sceneStore.getState());
    hoveredHandleId = groupMembers
      ? hitTestGroupHandles(scenePoint, groupMembers.bounds, zoom)
      : hitTestHandles(scenePoint, soleId, sceneStore.getState().nodes, zoom);
  } else if (selectedIds.size > 1) {
    const bounds = getGroupBounds(selectedIds, sceneStore.getState().nodes);
    hoveredHandleId = bounds ? hitTestGroupHandles(scenePoint, bounds, zoom) : null;
  } else {
    hoveredHandleId = null;
  }
}

function getCursor(): string {
  if (dragState?.kind === "resize") {
    return getResizeCursor(dragState.handleId, getHandles(dragState.nodeId, sceneStore.getState().nodes));
  }
  if (dragState?.kind === "group-resize") {
    return getResizeCursor(dragState.handleId, getGroupHandles(dragState.startBounds));
  }
  if (dragState?.kind === "move") return "grabbing";

  if (hoveredHandleId) {
    const { selectedIds } = selectionStore.getState();
    if (selectedIds.size === 1) {
      const [soleId] = selectedIds;
      const groupMembers = getGroupMemberBounds(soleId, sceneStore.getState());
      return groupMembers
        ? getResizeCursor(hoveredHandleId, getGroupHandles(groupMembers.bounds))
        : getResizeCursor(hoveredHandleId, getHandles(soleId, sceneStore.getState().nodes));
    }
    const bounds = getGroupBounds(selectedIds, sceneStore.getState().nodes);
    if (bounds) return getResizeCursor(hoveredHandleId, getGroupHandles(bounds));
  }

  return "default";
}

// A lone-selected persisted Group resizes as a unit (group + every
// descendant), reusing the same multi-select group-resize machinery as an
// ad-hoc selection — but with the member set derived from the group's own
// children instead of whatever's currently selected. Returns null for
// anything that isn't a non-empty group, so callers fall back to the plain
// single-node resize path.
function getGroupMemberBounds(soleId: NodeId, scene: SceneGraph): { bounds: Bounds; memberIds: NodeId[] } | null {
  const node = scene.nodes[soleId];
  if (!node || node.type !== "group" || node.children.length === 0) return null;

  const memberIds = collectWithDescendants(scene, [soleId]);
  const bounds = getGroupBounds(memberIds, scene.nodes);
  return bounds ? { bounds, memberIds } : null;
}

function toggleId(ids: Set<NodeId>, id: NodeId): Set<NodeId> {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function startMoveDrag(scenePoint: Point): void {
  const { nodes, rootIds } = sceneStore.getState();
  const { selectedIds } = selectionStore.getState();

  const snapshots = new Map<NodeId, SceneNode>();
  for (const id of selectedIds) {
    const node = nodes[id];
    if (node && !node.locked) snapshots.set(id, node);
  }

  dragState = { kind: "move", startPoint: scenePoint, snapshots, startRootIds: rootIds, touchedContainers: new Map() };
}

function applyMove(drag: MoveDrag, scenePoint: Point): void {
  const dx = scenePoint.x - drag.startPoint.x;
  const dy = scenePoint.y - drag.startPoint.y;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, start] of drag.snapshots) {
      const current = nodes[id];
      if (!current) continue;
      nodes[id] = translateNode(scene, start, current, dx, dy);
    }
    return { ...scene, nodes };
  });

  reparentDraggedNodes(drag);
}

// A dragged node is reparented as soon as it crosses a frame/section
// boundary — not deferred to pointerup — because the renderer clips based
// on tree structure (what's actually listed in a frame's children), not on
// where a node happens to be drawn. Deferring this made a node visibly
// vanish for the whole drag the instant it left its old frame's clip
// bounds, since it was still structurally that frame's child until commit.
function reparentDraggedNodes(drag: MoveDrag): void {
  for (const id of drag.snapshots.keys()) {
    const scene = sceneStore.getState();
    const node = scene.nodes[id];
    if (!node) continue;

    const targetParentId = findContainerAt(id, scene);
    if (targetParentId === node.parentId) continue;

    captureIfMissing(drag.touchedContainers, scene, node.parentId);
    captureIfMissing(drag.touchedContainers, scene, targetParentId);
    sceneStore.reparentNode(id, targetParentId);
  }
}

// x/y (and line/arrow's x2/y2) are relative to the node's parent, which can
// change mid-drag now that reparenting happens live — so position can't
// just be "drag-start value + total delta" (that assumes a parent that
// never changes). Instead: recover the node's absolute scene position at
// drag start (start's local position + its start-time parent's origin),
// add the total delta, then re-express that in whatever parent the node is
// CURRENTLY in. Translation-only, same assumption as reparentNodeInGraph's
// own position fix (no rotated containers exist yet).
function translateNode(scene: SceneGraph, start: SceneNode, current: SceneNode, dx: number, dy: number): SceneNode {
  const startOrigin = getParentOrigin(scene, start.parentId);
  const currentOrigin = getParentOrigin(scene, current.parentId);
  const shiftX = startOrigin.x - currentOrigin.x + dx;
  const shiftY = startOrigin.y - currentOrigin.y + dy;

  if (current.type === "line" || current.type === "arrow") {
    // start and current are the same node at different points in the same
    // gesture, so they always share a type — this cast just tells
    // TypeScript what the runtime already guarantees.
    const startEndpoint = start as LineNode | ArrowNode;
    return {
      ...current,
      x: start.x + shiftX,
      y: start.y + shiftY,
      x2: startEndpoint.x2 + shiftX,
      y2: startEndpoint.y2 + shiftY,
    };
  }
  return { ...current, x: start.x + shiftX, y: start.y + shiftY };
}

function startMarqueeDrag(scenePoint: Point, additive: boolean, currentSelectedIds: Set<NodeId>): void {
  dragState = {
    kind: "marquee",
    startPoint: scenePoint,
    baseSelectedIds: additive ? currentSelectedIds : new Set(),
    additive,
  };
  marqueeStore.update(() => ({ start: scenePoint, current: scenePoint }));
  // Applied immediately (not deferred to the first pointermove) so a plain
  // click with no drag at all still clears the selection right away, same
  // as the old "click empty space" behavior — a zero-size marquee rect
  // naturally intersects nothing.
  applyMarqueeSelection(dragState, scenePoint);
}

function applyMarqueeSelection(drag: MarqueeDrag, scenePoint: Point): void {
  const scene = sceneStore.getState();
  const hits = marqueeSelectedIds(scene, drag.startPoint, scenePoint);
  const nextSelectedIds = drag.additive ? new Set([...drag.baseSelectedIds, ...hits]) : hits;
  selectionStore.update((state) => ({ ...state, selectedIds: nextSelectedIds }));
}

function startResizeDrag(nodeId: NodeId, handleId: HandleId): void {
  const node = sceneStore.getState().nodes[nodeId];
  if (!node || node.locked) return;
  dragState = { kind: "resize", nodeId, handleId, startNode: node };
}

function startGroupResizeDrag(selectedIds: Set<NodeId>, startBounds: Bounds, handleId: BBoxHandleId): void {
  const { nodes, rootIds } = sceneStore.getState();
  const snapshots = new Map<NodeId, SceneNode>();
  for (const id of selectedIds) {
    const node = nodes[id];
    if (node && !node.locked) snapshots.set(id, node);
  }
  if (snapshots.size === 0) return;

  dragState = { kind: "group-resize", handleId, startBounds, snapshots, startRootIds: rootIds };
}

function applyGroupResize(drag: GroupResizeDrag, scenePoint: Point): void {
  const scale = computeGroupScale(drag.startBounds, drag.handleId, scenePoint);
  const memberIds = drag.snapshots;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, startNode] of drag.snapshots) {
      const parentIsAlsoResizing = startNode.parentId !== null && memberIds.has(startNode.parentId);
      nodes[id] = resizeNodeInGroup(startNode, scale, scene, parentIsAlsoResizing);
    }
    return { ...scene, nodes };
  });
}

function applyResize(drag: ResizeDrag, scenePoint: Point): void {
  const { startNode, handleId, nodeId } = drag;
  const { nodes } = sceneStore.getState();

  // startNode.type and handleId are correlated by construction: getHandles()
  // only ever produces "start"/"end" for line/arrow nodes, and the 8 bbox
  // handles for every other type — so this pairing always holds at runtime
  // even though the two variables narrow independently for TypeScript.
  const resized =
    startNode.type === "line" || startNode.type === "arrow"
      ? resizeEndpointNode(
          startNode,
          handleId as EndpointHandleId,
          getAncestorLocalPoint(scenePoint, startNode.parentId, nodes),
        )
      : resizeBBoxNode(startNode, handleId as BBoxHandleId, getBBoxLocalPoint(scenePoint, startNode, nodes));

  sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [nodeId]: resized } }));
}

export const selectTool: Tool = { onPointerDown, onPointerMove, onPointerUp, getCursor, onDoubleClick };
