import type { EllipseNode } from "../../../types/scene";
import { applyStrokeStyle } from "./strokeStyle";

export function buildEllipseGeometry(node: EllipseNode): Path2D {
  const rx = node.width / 2;
  const ry = node.height / 2;
  const path = new Path2D();
  path.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
  return path;
}

export function drawEllipse(ctx: CanvasRenderingContext2D, node: EllipseNode): void {
  const path = buildEllipseGeometry(node);
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
