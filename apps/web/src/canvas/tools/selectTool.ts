import {
  collectWithDescendants,
  createMoveNodeCommand,
  createSetNodeCommand,
  getWorldMatrix,
  isEffectivelyLocked,
  transformPoint,
  type MoveSnapshot,
} from "@open-canvas/commands";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { viewportStore } from "../../store/viewportStore";
import type { ArrowNode, LineNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import { findContainerAt } from "./containment";
import { findFlexInsertionIndex } from "./flexInsertion";
import type { FlexInsertionResult } from "./flexInsertion";
import { flexInsertionStore } from "./flexInsertionStore";
import { computeGroupScale, getGroupBounds, getGroupHandles, hitTestGroupHandles, resizeNodeInGroup } from "./groupResize";
import type { Bounds } from "./groupResize";
import { hitTestScene } from "./hitTest";
import { marqueeSelectedIds } from "./marqueeSelection";
import { marqueeStore } from "./marqueeStore";
import { getResizeCursor } from "./resizeCursor";
import { getHandles, hitTestHandles } from "./resizeHandles";
import type { BBoxHandleId, EndpointHandleId, HandleId } from "./resizeHandles";
import { getAncestorLocalPoint, getBBoxLocalPoint, HANDLE_AXES, resizeBBoxNode, resizeEndpointNode } from "./resizeMath";
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
  // Snapshotted nodes that started as flow children of a flex-mode parent —
  // without intervention, resolveFlexLayout (wired into every sceneStore
  // update) would snap them straight back into their flex-computed slot on
  // every pointermove, so the node's own dragged position could never
  // actually leave its container: findContainerAt would keep re-detecting
  // the same parent forever. Forced to "absolute" on the first real
  // pointermove (not at pointerdown — see applyMove/flexOverridesApplied,
  // a plain click must never touch these) so the drag's own position write
  // sticks, then restored to "flow" once the drag settles (commitMove).
  flexOverrides: Set<NodeId>;
  flexOverridesApplied: boolean;
  // True once total pointer movement since startPoint has crossed
  // MOVE_DRAG_THRESHOLD_PX — see applyMove. A real click's natural
  // sub-pixel jiggle between pointerdown and pointerup otherwise fires at
  // least one pointermove with a nonzero (if tiny) delta, which used to be
  // harmless (an imperceptible nudge on an absolutely-positioned node) but
  // is now a visible, discrete reshuffle for a flex child, since even a
  // 1px nudge can cross the midpoint between two siblings and reorder them.
  hasCrossedThreshold: boolean;
}

interface ResizeDrag {
  kind: "resize";
  nodeId: NodeId;
  handleId: HandleId;
  // The true pre-drag value — used only as commitResize's undo "before",
  // so undo restores the original sizing mode too, not just position/size.
  startNode: SceneNode;
  // Same node, but with sizingHorizontal/Vertical forced to "fixed" on
  // whichever axis this drag's handle touches, if the node's parent is a
  // flex container (see startResizeDrag). This is what every pointermove
  // actually resizes from, so the flip sticks for the whole gesture and
  // the live flex reconciliation reflows siblings as you drag, matching
  // Figma's own "manually resizing a hug/fill child converts it to fixed"
  // behavior.
  resizeBaseNode: SceneNode;
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
  // The true pre-drag values — used only as commitGroupResize's undo
  // "before", same split as ResizeDrag.startNode/resizeBaseNode.
  snapshots: Map<NodeId, SceneNode>;
  // Same nodes, each with sizingHorizontal/Vertical forced to "fixed" on
  // whichever axis this handle's scale actually touches, for any member
  // that's a flex flow child — see fixedSizingForHandle. Without this, a
  // fill/hug member would get resized by resizeNodeInGroup and then
  // immediately snapped back to its old size by the same update's
  // resolveFlexLayout pass, since single-node resize's freeze-to-fixed
  // policy never applied to the multi-select/group-resize path.
  resizeBaseSnapshots: Map<NodeId, SceneNode>;
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

  // A shift-click only ever adjusts the selection — arming a move-drag on
  // the same pointerdown would let a small subsequent pointermove silently
  // move whatever was just toggled, when the user's evident intent was
  // purely to change the selection. A plain click still arms a drag
  // exactly as before, whether it's selecting something new or continuing
  // to drag an already-selected multi-selection.
  if (!shiftKey) startMoveDrag(scenePoint);
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
  if (node && node.type === "text" && !isEffectivelyLocked(scene, hitId)) {
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
  flexInsertionStore.update(() => null);
}

// Fires on pointercancel (the browser aborting the gesture — e.g. a
// system gesture taking over, or the tab losing focus mid-drag) and on
// lostpointercapture (capture released some other way without a normal
// pointerup). Either way the drag can no longer be trusted to end
// normally: unlike onPointerUp, this must NOT commit whatever the last
// pointermove happened to write — every intermediate frame of a move/
// resize already writes straight to sceneStore for live feedback (see
// applyMove/applyResize/applyGroupResize), so leaving dragState as-is
// would strand that in the scene with no undo entry ever recorded for it.
function onPointerCancel(): void {
  if (!dragState) return;
  abortDrag(dragState);
  dragState = null;
  flexInsertionStore.update(() => null);
}

// Reverts the scene to exactly its pre-drag state — the inverse of what
// commitDrag would have gathered, applied directly instead of wrapped in
// an undoable command (there's nothing to undo: the drag never happened
// as far as history is concerned).
function abortDrag(drag: DragState): void {
  if (drag.kind === "move") {
    sceneStore.update((scene) => {
      const nodes = { ...scene.nodes };
      for (const [id, snapshot] of drag.snapshots) nodes[id] = snapshot;
      for (const [id, snapshot] of drag.touchedContainers) nodes[id] = snapshot;
      return { nodes, rootIds: drag.startRootIds };
    });
  } else if (drag.kind === "resize") {
    sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [drag.nodeId]: drag.startNode } }));
  } else if (drag.kind === "group-resize") {
    sceneStore.update((scene) => {
      const nodes = { ...scene.nodes };
      for (const [id, snapshot] of drag.snapshots) nodes[id] = snapshot;
      return { nodes, rootIds: drag.startRootIds };
    });
  } else if (drag.kind === "marquee") {
    selectionStore.update((state) => ({ ...state, selectedIds: drag.baseSelectedIds }));
    marqueeStore.update(() => null);
  }
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
  restoreFlexPositioning(drag);

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

// Restores "flow" on whichever nodes applyMove forced to "absolute" for
// the drag (see MoveDrag.flexOverrides) — skipped entirely if the drag
// never actually moved (flexOverridesApplied stays false for a plain
// click), so a bare click on a flex flow child never round-trips its
// positioning field and never produces a spurious undo entry for it.
// Runs as one more sceneStore.update() before commitMove reads the
// "after" state, so the resulting undo snapshot reflects the fully
// resolved flex placement, not the mid-drag "picked up" state.
function restoreFlexPositioning(drag: MoveDrag): void {
  if (!drag.flexOverridesApplied || drag.flexOverrides.size === 0) return;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const id of drag.flexOverrides) {
      const node = nodes[id];
      if (node) nodes[id] = { ...node, positioning: "flow" };
    }
    return { ...scene, nodes };
  });
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
  const scene = sceneStore.getState();
  const { nodes, rootIds } = scene;
  const { selectedIds } = selectionStore.getState();
  const topLevelIds = topLevelSelectedIds(selectedIds, nodes);

  const snapshots = new Map<NodeId, SceneNode>();
  for (const id of topLevelIds) {
    const node = nodes[id];
    if (node && !isEffectivelyLocked(scene, id)) snapshots.set(id, node);
  }

  const flexOverrides = new Set<NodeId>();
  for (const node of snapshots.values()) {
    if (node.positioning === "flow" && isFlexModeParent(node.parentId, nodes)) {
      flexOverrides.add(node.id);
    }
  }

  dragState = {
    kind: "move",
    startPoint: scenePoint,
    snapshots,
    startRootIds: rootIds,
    touchedContainers: new Map(),
    flexOverrides,
    flexOverridesApplied: false,
    hasCrossedThreshold: false,
  };
}

// Excludes any selected id whose ancestor is ALSO selected — a child's
// local x/y is already relative to its parent, so if both a container and
// one of its own descendants are selected and dragged together, applying
// the same delta to both would double the descendant's effective
// on-screen displacement (the parent moving already carries it along).
function topLevelSelectedIds(selectedIds: Set<NodeId>, nodes: Record<NodeId, SceneNode>): Set<NodeId> {
  const result = new Set<NodeId>();
  for (const id of selectedIds) {
    let hasSelectedAncestor = false;
    let current = nodes[id]?.parentId ?? null;
    while (current) {
      if (selectedIds.has(current)) {
        hasSelectedAncestor = true;
        break;
      }
      current = nodes[current]?.parentId ?? null;
    }
    if (!hasSelectedAncestor) result.add(id);
  }
  return result;
}

function isFlexModeParent(parentId: NodeId | null, nodes: Record<NodeId, SceneNode>): boolean {
  if (!parentId) return false;
  const parent = nodes[parentId];
  return parent !== undefined && (parent.type === "frame" || parent.type === "section") && parent.layoutMode === "flex";
}

// Screen pixels, not scene units — matches HANDLE_HIT_RADIUS's own
// zoom-independent-feel convention elsewhere in this file, so the click
// vs. drag distinction feels the same regardless of zoom level.
const MOVE_DRAG_THRESHOLD_PX = 3;

function applyMove(drag: MoveDrag, scenePoint: Point): void {
  const dx = scenePoint.x - drag.startPoint.x;
  const dy = scenePoint.y - drag.startPoint.y;

  if (!drag.hasCrossedThreshold) {
    const zoom = viewportStore.getState().zoom;
    if (Math.hypot(dx, dy) * zoom < MOVE_DRAG_THRESHOLD_PX) return;
    drag.hasCrossedThreshold = true;
  }

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, start] of drag.snapshots) {
      const current = nodes[id];
      if (!current) continue;
      const translated = translateNode(scene, start, current, dx, dy);
      // Forced here (not at pointerdown, in startMoveDrag) so a plain
      // click that never actually moves never touches these nodes at
      // all — see MoveDrag.flexOverrides and restoreFlexPositioning.
      // Idempotent across every pointermove of the same drag.
      nodes[id] = drag.flexOverrides.has(id) ? { ...translated, positioning: "absolute" } : translated;
    }
    return { ...scene, nodes };
  });
  if (drag.flexOverrides.size > 0) drag.flexOverridesApplied = true;

  reparentDraggedNodes(drag, scenePoint);
}

// A dragged node is reparented as soon as it crosses a frame/section
// boundary — not deferred to pointerup — because the renderer clips based
// on tree structure (what's actually listed in a frame's children), not on
// where a node happens to be drawn. Deferring this made a node visibly
// vanish for the whole drag the instant it left its old frame's clip
// bounds, since it was still structurally that frame's child until commit.
//
// A flex-mode target additionally gets an insertion index (not just a
// parent) — findFlexInsertionIndex also drives the live indicator line via
// flexInsertionStore, cleared unconditionally at pointerup (onPointerUp).
function reparentDraggedNodes(drag: MoveDrag, scenePoint: Point): void {
  const draggedIds = new Set(drag.snapshots.keys());
  let insertion: FlexInsertionResult | null = null;

  for (const id of draggedIds) {
    const scene = sceneStore.getState();
    const node = scene.nodes[id];
    if (!node) continue;

    // Excludes every currently-dragged node, not just this one — otherwise
    // two nodes dragged together could have one reparented into the other
    // mid-gesture the instant their bounds happened to overlap.
    const targetParentId = findContainerAt(id, scene, draggedIds);
    const found = targetParentId ? findFlexInsertionIndex(scenePoint, targetParentId, scene, draggedIds) : null;

    if (found) {
      insertion = found;
      captureIfMissing(drag.touchedContainers, scene, node.parentId);
      captureIfMissing(drag.touchedContainers, scene, targetParentId);
      sceneStore.reorderNode(id, targetParentId, found.index);
      continue;
    }

    if (targetParentId === node.parentId) continue;
    captureIfMissing(drag.touchedContainers, scene, node.parentId);
    captureIfMissing(drag.touchedContainers, scene, targetParentId);
    sceneStore.reparentNode(id, targetParentId);
  }

  flexInsertionStore.update(() => insertion);
}

// x/y (and line/arrow's x2/y2) are relative to the node's parent, which can
// change mid-drag now that reparenting happens live — so position can't
// just be "drag-start value + total delta" (that assumes a parent that
// never changes). Instead: recover the node's absolute scene position at
// drag start via the start-time parent's full world matrix, add the total
// delta in scene space, then re-express that back through the inverse of
// whatever parent the node is CURRENTLY in — a full matrix round-trip, not
// a plain origin-point subtraction, so dragging stays correct (the node
// moves in the same screen direction as the pointer) even if either parent
// is rotated. Matches getAncestorLocalPoint/getBBoxLocalPoint's own
// world-matrix approach already used for resize — move was the one path
// still doing translation-only math.
function translateNode(scene: SceneGraph, start: SceneNode, current: SceneNode, dx: number, dy: number): SceneNode {
  const startMatrix = start.parentId ? getWorldMatrix(start.parentId, scene.nodes) : new DOMMatrix();
  const toCurrentLocal = (current.parentId ? getWorldMatrix(current.parentId, scene.nodes) : new DOMMatrix()).inverse();

  const anchorWorld = transformPoint(startMatrix, { x: start.x, y: start.y });
  const anchor = transformPoint(toCurrentLocal, { x: anchorWorld.x + dx, y: anchorWorld.y + dy });

  if (current.type === "line" || current.type === "arrow") {
    // start and current are the same node at different points in the same
    // gesture, so they always share a type — this cast just tells
    // TypeScript what the runtime already guarantees.
    const startEndpoint = start as LineNode | ArrowNode;
    const endpointWorld = transformPoint(startMatrix, { x: startEndpoint.x2, y: startEndpoint.y2 });
    const endpoint = transformPoint(toCurrentLocal, { x: endpointWorld.x + dx, y: endpointWorld.y + dy });
    return { ...current, x: anchor.x, y: anchor.y, x2: endpoint.x, y2: endpoint.y };
  }
  return { ...current, x: anchor.x, y: anchor.y };
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
  const scene = sceneStore.getState();
  const node = scene.nodes[nodeId];
  if (!node || isEffectivelyLocked(scene, nodeId)) return;
  dragState = { kind: "resize", nodeId, handleId, startNode: node, resizeBaseNode: fixedSizingForHandle(node, handleId) };
}

// A flex child manually resized via a bbox handle switches whichever axis
// that handle touches from hug/fill to fixed — otherwise the very next
// reconciliation cycle (resolveFlexLayout, wired into every sceneStore
// update) would just snap the drag's result straight back to its
// hug/fill-computed size, fighting the user's own gesture. Endpoint
// handles (line/arrow) have no bbox axes to touch, so this is a no-op for
// them regardless of parent.
// Shared by both startResizeDrag (single node) and startGroupResizeDrag
// (each member independently) — a handle's touched axes are the same
// either way, only the node being checked differs.
function fixedSizingForHandle(node: SceneNode, handleId: HandleId): SceneNode {
  if (!(handleId in HANDLE_AXES)) return node;

  const parent = node.parentId ? sceneStore.getState().nodes[node.parentId] : null;
  const isFlexParent = parent !== null && (parent.type === "frame" || parent.type === "section") && parent.layoutMode === "flex";
  if (!isFlexParent) return node;

  const axes = HANDLE_AXES[handleId as BBoxHandleId];
  return {
    ...node,
    sizingHorizontal: axes.horizontal !== null ? "fixed" : node.sizingHorizontal,
    sizingVertical: axes.vertical !== null ? "fixed" : node.sizingVertical,
  };
}

function startGroupResizeDrag(selectedIds: Set<NodeId>, startBounds: Bounds, handleId: BBoxHandleId): void {
  const scene = sceneStore.getState();
  const { nodes, rootIds } = scene;
  const snapshots = new Map<NodeId, SceneNode>();
  for (const id of selectedIds) {
    const node = nodes[id];
    if (node && !isEffectivelyLocked(scene, id)) snapshots.set(id, node);
  }
  if (snapshots.size === 0) return;

  const resizeBaseSnapshots = new Map<NodeId, SceneNode>();
  for (const [id, node] of snapshots) {
    resizeBaseSnapshots.set(id, fixedSizingForHandle(node, handleId));
  }

  dragState = { kind: "group-resize", handleId, startBounds, snapshots, resizeBaseSnapshots, startRootIds: rootIds };
}

function applyGroupResize(drag: GroupResizeDrag, scenePoint: Point): void {
  const scale = computeGroupScale(drag.startBounds, drag.handleId, scenePoint);
  const memberIds = drag.snapshots;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, startNode] of drag.resizeBaseSnapshots) {
      const parentIsAlsoResizing = startNode.parentId !== null && memberIds.has(startNode.parentId);
      nodes[id] = resizeNodeInGroup(startNode, scale, scene, parentIsAlsoResizing);
    }
    return { ...scene, nodes };
  });
}

function applyResize(drag: ResizeDrag, scenePoint: Point): void {
  const { resizeBaseNode, handleId, nodeId } = drag;
  const { nodes } = sceneStore.getState();

  // resizeBaseNode.type and handleId are correlated by construction:
  // getHandles() only ever produces "start"/"end" for line/arrow nodes,
  // and the 8 bbox handles for every other type — so this pairing always
  // holds at runtime even though the two variables narrow independently
  // for TypeScript. resizeBaseNode (not startNode) is what every
  // pointermove resizes from — see the ResizeDrag/fixedSizingForHandle
  // comments for why.
  const resized =
    resizeBaseNode.type === "line" || resizeBaseNode.type === "arrow"
      ? resizeEndpointNode(
          resizeBaseNode,
          handleId as EndpointHandleId,
          getAncestorLocalPoint(scenePoint, resizeBaseNode.parentId, nodes),
        )
      : resizeBBoxNode(resizeBaseNode, handleId as BBoxHandleId, getBBoxLocalPoint(scenePoint, resizeBaseNode, nodes));

  sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [nodeId]: resized } }));
}

export const selectTool: Tool = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, getCursor, onDoubleClick };
