export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  pan: Point;
  zoom: number;
}

export const INITIAL_VIEWPORT: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 };

export function screenToScene(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.pan.x) / viewport.zoom,
    y: (screenPoint.y - viewport.pan.y) / viewport.zoom,
  };
}

export function sceneToScreen(scenePoint: Point, viewport: Viewport): Point {
  return {
    x: scenePoint.x * viewport.zoom + viewport.pan.x,
    y: scenePoint.y * viewport.zoom + viewport.pan.y,
  };
}
