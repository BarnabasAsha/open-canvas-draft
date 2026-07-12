import type { RectNode } from "../../../types/scene";

export function drawRect(ctx: CanvasRenderingContext2D, node: RectNode): void {
  const { width, height, cornerRadius, fill, stroke, strokeWidth } = node;

  ctx.beginPath();
  if (cornerRadius > 0) {
    ctx.roundRect(0, 0, width, height, cornerRadius);
  } else {
    ctx.rect(0, 0, width, height);
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
