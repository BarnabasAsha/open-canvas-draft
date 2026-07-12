import type { Point, Viewport } from "../utils/coordinates";
import { screenToScene } from "../utils/coordinates";

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, pan: { x: viewport.pan.x - dx, y: viewport.pan.y - dy } };
}

// Zooms by `factor` while keeping the scene point currently under
// `screenPoint` fixed on screen — the standard "zoom to cursor" feel,
// rather than always zooming toward the origin.
export function zoomAtPoint(viewport: Viewport, screenPoint: Point, factor: number): Viewport {
  const nextZoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const scenePoint = screenToScene(screenPoint, viewport);
  return {
    zoom: nextZoom,
    pan: {
      x: screenPoint.x - scenePoint.x * nextZoom,
      y: screenPoint.y - scenePoint.y * nextZoom,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
