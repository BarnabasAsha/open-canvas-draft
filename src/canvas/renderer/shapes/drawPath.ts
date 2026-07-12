import type { PathNode, PathPoint } from "../../../types/scene";

export function drawPath(ctx: CanvasRenderingContext2D, node: PathNode): void {
  const { points, closed, fill, stroke, strokeWidth } = node;
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    tracePathSegment(ctx, points[i - 1], points[i]);
  }

  if (closed) {
    tracePathSegment(ctx, points[points.length - 1], points[0]);
    ctx.closePath();
  }

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

// handleOut/handleIn are absolute control-point positions (same space as the
// points themselves), not offsets — a curve segment exists only when the
// segment's own endpoints define one.
function tracePathSegment(ctx: CanvasRenderingContext2D, from: PathPoint, to: PathPoint): void {
  if (from.handleOut || to.handleIn) {
    const controlStart = from.handleOut ?? from;
    const controlEnd = to.handleIn ?? to;
    ctx.bezierCurveTo(controlStart.x, controlStart.y, controlEnd.x, controlEnd.y, to.x, to.y);
  } else {
    ctx.lineTo(to.x, to.y);
  }
}
