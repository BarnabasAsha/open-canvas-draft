import type { Viewport } from "../utils/coordinates";
import { screenToScene } from "../utils/coordinates";

const NICE_MULTIPLIERS = [1, 2, 5];
const TARGET_TICK_SPACING_PX = 80;

// Picks the smallest "nice" step (1/2/5 × 10^n) at or above whatever raw
// step would land ticks near the target screen spacing — the standard
// chart-axis-tick algorithm, so labels read as round numbers (10, 20, 50…)
// instead of whatever the current zoom level happens to produce. Shared by
// the ruler (which axis to tick) and the grid overlay (which lines to draw)
// so they always agree with each other.
export function computeTickStep(zoom: number, targetSpacingPx = TARGET_TICK_SPACING_PX): number {
  const rawStep = targetSpacingPx / zoom;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  for (const multiplier of NICE_MULTIPLIERS) {
    const step = multiplier * magnitude;
    if (step >= rawStep) return step;
  }
  return 10 * magnitude;
}

export interface RulerTick {
  scenePos: number;
  screenPos: number;
}

// Every tick position along one axis currently within view, in both scene
// units (for the label) and screen pixels (for where to draw it) —
// screenLengthPx is the ruler's own length (canvas width for the
// horizontal ruler, height for vertical).
export function computeRulerTicks(viewport: Viewport, screenLengthPx: number, axis: "x" | "y"): RulerTick[] {
  const step = computeTickStep(viewport.zoom);
  const pan = axis === "x" ? viewport.pan.x : viewport.pan.y;

  const start = screenToScene({ x: 0, y: 0 }, viewport);
  const end = screenToScene(axis === "x" ? { x: screenLengthPx, y: 0 } : { x: 0, y: screenLengthPx }, viewport);
  const sceneStart = axis === "x" ? start.x : start.y;
  const sceneEnd = axis === "x" ? end.x : end.y;

  const firstTick = Math.floor(sceneStart / step) * step;
  const ticks: RulerTick[] = [];
  for (let scenePos = firstTick; scenePos <= sceneEnd; scenePos += step) {
    ticks.push({ scenePos: Math.round(scenePos), screenPos: scenePos * viewport.zoom + pan });
  }
  return ticks;
}
