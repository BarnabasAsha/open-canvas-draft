import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { NodeId, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
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

function onPointerUp(): void {
  dragState = null;
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
  const { nodes } = sceneStore.getState();
  const { selectedIds } = selectionStore.getState();

  const snapshots = new Map<NodeId, SceneNode>();
  for (const id of selectedIds) {
    const node = nodes[id];
    if (node && !node.locked) snapshots.set(id, node);
  }

  dragState = { kind: "move", startPoint: scenePoint, snapshots };
}

function applyMove(drag: MoveDrag, scenePoint: Point): void {
  const dx = scenePoint.x - drag.startPoint.x;
  const dy = scenePoint.y - drag.startPoint.y;
  const snapshots = drag.snapshots;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, start] of snapshots) {
      if (!nodes[id]) continue;
      nodes[id] = translateNode(start, dx, dy);
    }
    return { ...scene, nodes };
  });
}

// x/y is every node's position, but line/arrow also carry an independent
// x2/y2 endpoint — both must shift together or the shape shears instead of
// translating.
function translateNode(node: SceneNode, dx: number, dy: number): SceneNode {
  if (node.type === "line" || node.type === "arrow") {
    return { ...node, x: node.x + dx, y: node.y + dy, x2: node.x2 + dx, y2: node.y2 + dy };
  }
  return { ...node, x: node.x + dx, y: node.y + dy };
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
