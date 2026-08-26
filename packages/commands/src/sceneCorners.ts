import type { ArrowNode, LineNode, NodeId, SceneNode } from "@open-canvas/schema";
import type { Point } from "./worldTransform";
import { getWorldMatrix, transformPoint } from "./worldTransform";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Real graph members only — no awareness of virtual (component-instance
// child) ids, unlike apps/web's canvas/selectionBounds.ts::getSceneCorners,
// which additionally resolves those via the live componentsStore registry.
// Every caller here (GroupNodesCommand, CreateComponentInstanceCommand via
// componentMutations.ts) only ever groups/converts real top-level SceneGraph
// members, so that broader case doesn't apply — duplicating just the
// real-node math keeps this package free of any live apps/web store
// dependency rather than importing componentsStore's global singleton.
function getNodeSceneCorners(nodeId: NodeId, nodes: Record<NodeId, SceneNode>): [Point, Point, Point, Point] | null {
  const node = nodes[nodeId];
  if (!node) return null;

  if (node.type === "line" || node.type === "arrow") {
    return getEndpointBoxCorners(node, nodes);
  }

  return cornersFromMatrix(getWorldMatrix(nodeId, nodes), node.width, node.height);
}

export function getGroupBounds(selectedIds: Iterable<NodeId>, nodes: Record<NodeId, SceneNode>): Bounds | null {
  let bounds: Bounds | null = null;

  for (const id of selectedIds) {
    const corners = getNodeSceneCorners(id, nodes);
    if (!corners) continue;

    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const nodeBounds: Bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    bounds = bounds ? unionBounds(bounds, nodeBounds) : nodeBounds;
  }

  return bounds;
}

function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function cornersFromMatrix(matrix: DOMMatrix, width: number, height: number): [Point, Point, Point, Point] {
  const localCorners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  return localCorners.map((corner) => transformPoint(matrix, corner)) as [Point, Point, Point, Point];
}

function getEndpointBoxCorners(node: LineNode | ArrowNode, nodes: Record<NodeId, SceneNode>): [Point, Point, Point, Point] {
  const ancestorMatrix = node.parentId ? getWorldMatrix(node.parentId, nodes) : new DOMMatrix();

  const minX = Math.min(node.x, node.x2);
  const maxX = Math.max(node.x, node.x2);
  const minY = Math.min(node.y, node.y2);
  const maxY = Math.max(node.y, node.y2);

  const localCorners: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  return localCorners.map((corner) => transformPoint(ancestorMatrix, corner)) as [Point, Point, Point, Point];
}
