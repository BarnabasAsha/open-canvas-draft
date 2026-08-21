import type { LineNode } from "@open-canvas/schema";
import { applyStrokeStyle } from "./strokeStyle";

export function buildLineGeometry(node: LineNode): Path2D {
  const path = new Path2D();
  path.moveTo(0, 0);
  path.lineTo(node.x2 - node.x, node.y2 - node.y);
  return path;
}

export function drawLine(ctx: CanvasRenderingContext2D, node: LineNode): void {
  const path = buildLineGeometry(node);
  ctx.strokeStyle = node.stroke;
  ctx.lineWidth = node.strokeWidth;
  applyStrokeStyle(ctx, node.strokeStyle, node.strokeWidth);
  ctx.stroke(path);
}
