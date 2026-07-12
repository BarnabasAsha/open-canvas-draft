import type { ArrowNode } from "../../../types/scene";

const ARROWHEAD_ANGLE = Math.PI / 7;

export function drawArrow(ctx: CanvasRenderingContext2D, node: ArrowNode): void {
  const { x, y, x2, y2, stroke, strokeWidth, arrowheadSize } = node;
  const dx = x2 - x;
  const dy = y2 - y;
  const angle = Math.atan2(dy, dx);

  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(dx, dy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(
    dx - arrowheadSize * Math.cos(angle - ARROWHEAD_ANGLE),
    dy - arrowheadSize * Math.sin(angle - ARROWHEAD_ANGLE),
  );
  ctx.moveTo(dx, dy);
  ctx.lineTo(
    dx - arrowheadSize * Math.cos(angle + ARROWHEAD_ANGLE),
    dy - arrowheadSize * Math.sin(angle + ARROWHEAD_ANGLE),
  );
  ctx.stroke();
}
