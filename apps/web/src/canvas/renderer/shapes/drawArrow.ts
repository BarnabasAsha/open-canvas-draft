import type { ArrowNode } from "@open-canvas/schema";
import { applyStrokeStyle } from "./strokeStyle";

const ARROWHEAD_ANGLE = Math.PI / 7;

export function buildArrowGeometry(node: ArrowNode): Path2D {
  const { x, y, x2, y2, arrowheadSize } = node;
  const dx = x2 - x;
  const dy = y2 - y;
  const angle = Math.atan2(dy, dx);

  const path = new Path2D();
  path.moveTo(0, 0);
  path.lineTo(dx, dy);

  path.moveTo(dx, dy);
  path.lineTo(
    dx - arrowheadSize * Math.cos(angle - ARROWHEAD_ANGLE),
    dy - arrowheadSize * Math.sin(angle - ARROWHEAD_ANGLE),
  );
  path.moveTo(dx, dy);
  path.lineTo(
    dx - arrowheadSize * Math.cos(angle + ARROWHEAD_ANGLE),
    dy - arrowheadSize * Math.sin(angle + ARROWHEAD_ANGLE),
  );

  return path;
}

export function drawArrow(ctx: CanvasRenderingContext2D, node: ArrowNode): void {
  const path = buildArrowGeometry(node);
  ctx.strokeStyle = node.stroke;
  ctx.lineWidth = node.strokeWidth;
  applyStrokeStyle(ctx, node.strokeStyle, node.strokeWidth);
  ctx.stroke(path);
}
