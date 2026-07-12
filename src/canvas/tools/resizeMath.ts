import type { ArrowNode, LineNode, NodeId, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { getWorldMatrix } from "../../utils/worldTransform";
import type { BBoxHandleId, EndpointHandleId } from "./resizeHandles";

const MIN_SIZE = 1;

type Side = "min" | "max" | null;

const HANDLE_AXES: Record<BBoxHandleId, { horizontal: Side; vertical: Side }> = {
  nw: { horizontal: "min", vertical: "min" },
  n: { horizontal: null, vertical: "min" },
  ne: { horizontal: "max", vertical: "min" },
  e: { horizontal: "max", vertical: null },
  se: { horizontal: "max", vertical: "max" },
  s: { horizontal: null, vertical: "max" },
  sw: { horizontal: "min", vertical: "max" },
  w: { horizontal: "min", vertical: null },
};

// Maps a scene point into the node's parent's coordinate space (undoes only
// the ancestor chain, not the node's own rotation).
export function getAncestorLocalPoint(
  scenePoint: Point,
  parentId: NodeId | null,
  nodes: Record<NodeId, SceneNode>,
): Point {
  if (!parentId) return scenePoint;
  return invertMatrixPoint(getWorldMatrix(parentId, nodes), scenePoint);
}

// Same, plus un-rotates around the node's own start-of-drag center so bbox
// resize follows the shape's own axes rather than the screen's. Exact when
// rotation is 0 (the common case); for a rotated node the opposite corner
// can drift slightly during the drag, since rendering pivots around the
// *current* center while this pivots around the *start* center — a known
// simplification, not attempted to fully compensate here.
export function getBBoxLocalPoint(
  scenePoint: Point,
  startNode: SceneNode,
  nodes: Record<NodeId, SceneNode>,
): Point {
  const parentPoint = getAncestorLocalPoint(scenePoint, startNode.parentId, nodes);
  if (startNode.rotation === 0) return parentPoint;

  const center = { x: startNode.x + startNode.width / 2, y: startNode.y + startNode.height / 2 };
  return unrotateAroundCenter(parentPoint, center, startNode.rotation);
}

export function resizeBBoxNode(start: SceneNode, handleId: BBoxHandleId, localPoint: Point): SceneNode {
  const axes = HANDLE_AXES[handleId];
  const horizontal = resizeAxis(start.x, start.width, localPoint.x, axes.horizontal);
  const vertical = resizeAxis(start.y, start.height, localPoint.y, axes.vertical);

  return { ...start, x: horizontal.origin, y: vertical.origin, width: horizontal.size, height: vertical.size };
}

// Line/arrow resize deliberately ignores the node's own rotation (ancestor
// transform only) — ties dragging the endpoint directly to parent-space
// x2/y2, matching the "same coordinate space as x/y" contract on those
// fields. Correct whenever rotation is 0, which is the only case exercised
// today; a rotated line/arrow is a known TODO, not handled here.
export function resizeEndpointNode(
  start: LineNode | ArrowNode,
  handleId: EndpointHandleId,
  parentPoint: Point,
): LineNode | ArrowNode {
  const moved =
    handleId === "start"
      ? { ...start, x: parentPoint.x, y: parentPoint.y }
      : { ...start, x2: parentPoint.x, y2: parentPoint.y };

  // width/height aren't consulted when drawing a line/arrow (the segment is
  // defined entirely by x/y/x2/y2), but they're kept in sync as the span's
  // bounding size anyway — the selection outline and any future consumer
  // that trusts BaseNode's "uniform fields" contract depends on it.
  return { ...moved, width: Math.abs(moved.x2 - moved.x), height: Math.abs(moved.y2 - moved.y) };
}

// Resizes one axis (x/width or y/height) by keeping the edge opposite the
// dragged handle fixed. min/abs naturally normalizes if the dragged edge
// crosses past the fixed edge, so a handle can flip through the opposite
// corner and keep tracking the cursor instead of getting stuck at MIN_SIZE.
function resizeAxis(
  startOrigin: number,
  startSize: number,
  pointerLocal: number,
  side: Side,
): { origin: number; size: number } {
  if (side === null) return { origin: startOrigin, size: startSize };

  const fixedEdge = side === "min" ? startOrigin + startSize : startOrigin;
  const size = Math.max(Math.abs(pointerLocal - fixedEdge), MIN_SIZE);
  const origin = Math.min(pointerLocal, fixedEdge);

  return { origin, size };
}

function invertMatrixPoint(matrix: DOMMatrix, point: Point): Point {
  const transformed = matrix.inverse().transformPoint(new DOMPoint(point.x, point.y));
  return { x: transformed.x, y: transformed.y };
}

function unrotateAroundCenter(point: Point, center: Point, rotationDegrees: number): Point {
  const matrix = new DOMMatrix()
    .translate(center.x, center.y)
    .rotate(-rotationDegrees)
    .translate(-center.x, -center.y);
  const transformed = matrix.transformPoint(new DOMPoint(point.x, point.y));
  return { x: transformed.x, y: transformed.y };
}
