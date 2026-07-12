import type { LineNode } from "../../../types/scene";

export function drawLine(ctx: CanvasRenderingContext2D, node: LineNode): void {
  const { x, y, x2, y2, stroke, strokeWidth } = node;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(x2 - x, y2 - y);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();
}
