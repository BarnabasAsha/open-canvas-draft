import type { PathNode, PathPoint } from "@open-canvas/schema";
import { applyStrokeStyle } from "./strokeStyle";

// One Path2D for the whole node — every subpath contributes its own
// moveTo/closePath, so a node with 2+ subpaths (e.g. an icon's outer shape
// plus an inner hole) composes into one shape that fill(path, fillRule)
// resolves correctly, the same way a browser resolves a multi-"M" SVG `d`.
export function buildPathGeometry(node: PathNode): Path2D {
  const path = new Path2D();

  for (const { points, closed } of node.subpaths) {
    if (points.length === 0) continue;

    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      tracePathSegment(path, points[i - 1], points[i]);
    }
    if (closed) {
      tracePathSegment(path, points[points.length - 1], points[0]);
      path.closePath();
    }
  }

  return path;
}

export function drawPath(ctx: CanvasRenderingContext2D, node: PathNode): void {
  const path = buildPathGeometry(node);
  const { fill, stroke, strokeWidth, strokeStyle, fillRule } = node;

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path, fillRule);
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    applyStrokeStyle(ctx, strokeStyle, strokeWidth);
    ctx.stroke(path);
  }
}

// handleOut/handleIn are absolute control-point positions (same space as the
// points themselves), not offsets — a curve segment exists only when the
// segment's own endpoints define one.
function tracePathSegment(path: Path2D, from: PathPoint, to: PathPoint): void {
  if (from.handleOut || to.handleIn) {
    const controlStart = from.handleOut ?? from;
    const controlEnd = to.handleIn ?? to;
    path.bezierCurveTo(controlStart.x, controlStart.y, controlEnd.x, controlEnd.y, to.x, to.y);
  } else {
    path.lineTo(to.x, to.y);
  }
}
