// Shared by every node type whose click target is just its own bounding
// box (text/image/section/group today; more will follow) rather than a
// shape-specific outline.
export function rectBoundsPath(node: { width: number; height: number }): Path2D {
  const path = new Path2D();
  path.rect(0, 0, node.width, node.height);
  return path;
}

const MIN_STROKE_HIT_WIDTH = 4;

// A hairline stroke is nearly impossible to click precisely — widening the
// hit-tested line width (without touching the rendered strokeWidth) gives
// thin borders a forgiving click target, same as Figma/Illustrator.
export function strokeHit(ctx: CanvasRenderingContext2D, path: Path2D, strokeWidth: number, x: number, y: number): boolean {
  const previousLineWidth = ctx.lineWidth;
  ctx.lineWidth = Math.max(strokeWidth, MIN_STROKE_HIT_WIDTH);
  const hit = ctx.isPointInStroke(path, x, y);
  ctx.lineWidth = previousLineWidth;
  return hit;
}
