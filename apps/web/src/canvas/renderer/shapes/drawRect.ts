import type { RectNode } from "@open-canvas/schema";
import { applyStrokeStyle } from "./strokeStyle";

interface RoundedBox {
  width: number;
  height: number;
  cornerRadius: number;
}

export function buildRectGeometry(node: RoundedBox): Path2D {
  const path = new Path2D();
  if (node.cornerRadius > 0) {
    path.roundRect(0, 0, node.width, node.height, node.cornerRadius);
  } else {
    path.rect(0, 0, node.width, node.height);
  }
  return path;
}

export function drawRect(ctx: CanvasRenderingContext2D, node: RectNode): void {
  const path = buildRectGeometry(node);
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
