import type { PathNode, PathPoint } from "@open-canvas/schema";
import { applyStrokeStyle } from "./strokeStyle";

export function buildPathGeometry(node: PathNode): Path2D {
  const path = new Path2D();
  const { points, closed } = node;
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    tracePathSegment(path, points[i - 1], points[i]);
  }

  if (closed) {
    tracePathSegment(path, points[points.length - 1], points[0]);
    path.closePath();
  }

  return path;
}

export function drawPath(ctx: CanvasRenderingContext2D, node: PathNode): void {
  const path = buildPathGeometry(node);
  const { fill, stroke, strokeWidth, strokeStyle } = node;

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
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
