import { computeTickStep } from "../rulerTicks";
import type { Viewport } from "../../utils/coordinates";

// Runs inside drawScene's already-translated/scaled context, so every
// coordinate here is scene-space — reusing the ruler's own tick step keeps
// grid lines landing exactly on the ruler's tick marks instead of drifting
// out of sync with it.
export function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, width: number, height: number): void {
  const step = computeTickStep(viewport.zoom);

  const minX = -viewport.pan.x / viewport.zoom;
  const maxX = (width - viewport.pan.x) / viewport.zoom;
  const minY = -viewport.pan.y / viewport.zoom;
  const maxY = (height - viewport.pan.y) / viewport.zoom;

  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--grid-line").trim();
  // A canvas 2D context can't resolve CSS var() the way an SVG element's
  // `style` prop can — there's no cascade here, just a resolved string, so
  // this has to be read explicitly rather than passed as a literal.
  ctx.lineWidth = 1 / viewport.zoom; // constant 1 screen pixel regardless of zoom

  ctx.beginPath();
  for (let x = Math.floor(minX / step) * step; x <= maxX; x += step) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = Math.floor(minY / step) * step; y <= maxY; y += step) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
  ctx.restore();
}
