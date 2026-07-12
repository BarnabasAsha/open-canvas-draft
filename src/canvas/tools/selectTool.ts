import { createMoveNodeCommand } from "../../commands/MoveNodeCommand";
import type { MoveSnapshot } from "../../commands/MoveNodeCommand";
import { createResizeNodeCommand } from "../../commands/ResizeNodeCommand";
import { getParentOrigin } from "../../store/graphMutations";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { ArrowNode, LineNode, NodeId, SceneGraph, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { findContainerAt } from "./containment";
import { hitTestScene } from "./hitTest";
import { getResizeCursor } from "./resizeCursor";
import { getHandles, hitTestHandles } from "./resizeHandles";
import type { BBoxHandleId, EndpointHandleId, HandleId } from "./resizeHandles";
import { getAncestorLocalPoint, getBBoxLocalPoint, resizeBBoxNode, resizeEndpointNode } from "./resizeMath";
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

type DragState = MoveDrag | ResizeDrag;

let dragState: DragState | null = null;
let hoveredHandleId: HandleId | null = null;

function onPointerDown({ scenePoint, shiftKey }: ToolPointerEvent): void {
  const { selectedIds } = selectionStore.getState();

  if (selectedIds.size === 1) {
    const [soleId] = selectedIds;
    const handleId = hitTestHandles(scenePoint, soleId, sceneStore.getState().nodes);
    if (handleId) {
      startResizeDrag(soleId, handleId);
      return;
    }
  }

  const scene = sceneStore.getState();
  const hitId = hitTestScene(scenePoint, scene);

  if (!hitId) {
    dragState = null;
    if (!shiftKey && selectedIds.size > 0) {
      selectionStore.update((state) => ({ ...state, selectedIds: new Set() }));
    }
    return;
  }

  const keepsExistingGroup = !shiftKey && selectedIds.has(hitId);
  if (!keepsExistingGroup) {
    const nextSelectedIds = shiftKey ? toggleId(selectedIds, hitId) : new Set([hitId]);
    selectionStore.update((state) => ({ ...state, selectedIds: nextSelectedIds }));
  }

  startMoveDrag(scenePoint);
}

function onPointerMove({ scenePoint }: ToolPointerEvent): void {
  if (!dragState) {
    updateHoverState(scenePoint);
    return;
  }

  if (dragState.kind === "resize") {
    applyResize(dragState, scenePoint);
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
  } else {
    commitResize(drag);
  }
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

  historyManager.execute(createResizeNodeCommand(drag.nodeId, drag.startNode, current));
}

function updateHoverState(scenePoint: Point): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size !== 1) {
    hoveredHandleId = null;
    return;
  }

  const [soleId] = selectedIds;
  hoveredHandleId = hitTestHandles(scenePoint, soleId, sceneStore.getState().nodes);
}

function getCursor(): string {
  if (dragState?.kind === "resize") {
    return getResizeCursor(dragState.handleId, getHandles(dragState.nodeId, sceneStore.getState().nodes));
  }
  if (dragState?.kind === "move") return "grabbing";

  if (hoveredHandleId) {
    const { selectedIds } = selectionStore.getState();
    const [soleId] = selectedIds;
    return getResizeCursor(hoveredHandleId, getHandles(soleId, sceneStore.getState().nodes));
  }

  return "default";
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

function startResizeDrag(nodeId: NodeId, handleId: HandleId): void {
  const node = sceneStore.getState().nodes[nodeId];
  if (!node || node.locked) return;
  dragState = { kind: "resize", nodeId, handleId, startNode: node };
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

export const selectTool: Tool = { onPointerDown, onPointerMove, onPointerUp, getCursor };
