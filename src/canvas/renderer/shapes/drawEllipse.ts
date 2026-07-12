import type { EllipseNode } from "../../../types/scene";

export function drawEllipse(ctx: CanvasRenderingContext2D, node: EllipseNode): void {
  const { width, height, fill, stroke, strokeWidth } = node;
  const rx = width / 2;
  const ry = height / 2;

  ctx.beginPath();
  ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);

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
