import type { PathPoint } from "../../types/scene";
import type { Point } from "../../utils/coordinates";

export interface DraftAnchor {
  point: Point;
  handleIn?: Point;
  handleOut?: Point;
}

// Reflects a dragged-out handle through its anchor to get the symmetric
// opposite handle — the standard "drag one side, the other side mirrors"
// bezier behavior.
export function mirrorHandle(anchor: Point, handle: Point): Point {
  return { x: 2 * anchor.x - handle.x, y: 2 * anchor.y - handle.y };
}

export function isNearPoint(a: Point, b: Point, threshold: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= threshold;
}

export interface RebasedPath {
  origin: Point;
  width: number;
  height: number;
  points: PathPoint[];
}

// Anchors/handles are tracked in absolute scene coordinates while drawing,
// but PathNode.points are local, relative to the node's own x/y origin.
// Fixing that origin at the first anchor would let later points go
// negative (drawing up/left of where you started), breaking the
// "(0,0)-(width,height)" bbox assumption every other tool's selection
// outline, resize handles, and containment check rely on for this node.
// Recomputing the true top-left origin from scratch on every update and
// re-expressing every point relative to it keeps that assumption honest —
// the same normalization rectFromPoints does for a 2-point drag,
// generalized to an arbitrary point list.
export function rebaseAnchors(anchors: DraftAnchor[]): RebasedPath {
  const allCoords = anchors.flatMap((anchor) =>
    [anchor.point, anchor.handleIn, anchor.handleOut].filter(isDefined),
  );

  const minX = Math.min(...allCoords.map((p) => p.x));
  const minY = Math.min(...allCoords.map((p) => p.y));
  const maxX = Math.max(...allCoords.map((p) => p.x));
  const maxY = Math.max(...allCoords.map((p) => p.y));
  const origin: Point = { x: minX, y: minY };

  const points: PathPoint[] = anchors.map((anchor) => ({
    x: anchor.point.x - origin.x,
    y: anchor.point.y - origin.y,
    handleIn: anchor.handleIn ? offset(anchor.handleIn, origin) : undefined,
    handleOut: anchor.handleOut ? offset(anchor.handleOut, origin) : undefined,
  }));

  return { origin, width: maxX - minX, height: maxY - minY, points };
}

function offset(point: Point, origin: Point): Point {
  return { x: point.x - origin.x, y: point.y - origin.y };
}

function isDefined(value: Point | undefined): value is Point {
  return value !== undefined;
}
