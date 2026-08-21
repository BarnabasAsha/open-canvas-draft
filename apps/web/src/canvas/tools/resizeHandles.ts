import { getWorldMatrix } from "@open-canvas/commands";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";

export type BBoxHandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type EndpointHandleId = "start" | "end";
export type HandleId = BBoxHandleId | EndpointHandleId;

export interface Handle {
  id: HandleId;
  point: Point;
}

// Screen-pixel hit radius — hitTestHandles divides this by zoom to convert
// it into the scene-unit radius that's actually correct at the current
// zoom level, so the click target stays a constant on-screen size instead
// of shrinking to nothing when zoomed out or ballooning when zoomed in.
export const HANDLE_HIT_RADIUS = 8;

export function getHandles(nodeId: NodeId, nodes: Record<NodeId, SceneNode>): Handle[] {
  const node = nodes[nodeId];
  if (!node) return [];

  if (node.type === "line" || node.type === "arrow") {
    // Endpoints are defined in parent space, independent of the node's own
    // rotation — see resizeMath.ts for why that rotation is ignored here.
    const ancestorMatrix = node.parentId ? getWorldMatrix(node.parentId, nodes) : new DOMMatrix();
    return [
      { id: "start", point: transformPoint(ancestorMatrix, node.x, node.y) },
      { id: "end", point: transformPoint(ancestorMatrix, node.x2, node.y2) },
    ];
  }

  const matrix = getWorldMatrix(nodeId, nodes);
  const localPoints = getLocalHandlePoints(node.width, node.height);

  return (Object.keys(localPoints) as BBoxHandleId[]).map((id) => ({
    id,
    point: transformPoint(matrix, localPoints[id].x, localPoints[id].y),
  }));
}

export function hitTestHandles(
  scenePoint: Point,
  nodeId: NodeId,
  nodes: Record<NodeId, SceneNode>,
  zoom: number,
): HandleId | null {
  const radius = HANDLE_HIT_RADIUS / zoom;
  for (const handle of getHandles(nodeId, nodes)) {
    const dx = handle.point.x - scenePoint.x;
    const dy = handle.point.y - scenePoint.y;
    if (Math.hypot(dx, dy) <= radius) return handle.id;
  }
  return null;
}

export function getLocalHandlePoints(width: number, height: number): Record<BBoxHandleId, Point> {
  return {
    nw: { x: 0, y: 0 },
    n: { x: width / 2, y: 0 },
    ne: { x: width, y: 0 },
    e: { x: width, y: height / 2 },
    se: { x: width, y: height },
    s: { x: width / 2, y: height },
    sw: { x: 0, y: height },
    w: { x: 0, y: height / 2 },
  };
}

function transformPoint(matrix: DOMMatrix, x: number, y: number): Point {
  const transformed = matrix.transformPoint(new DOMPoint(x, y));
  return { x: transformed.x, y: transformed.y };
}
