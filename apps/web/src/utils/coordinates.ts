export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  pan: Point;
  zoom: number;
}

// zoom 1 == 100%. Deliberately not 1 — landing on a design at full zoom
// tends to clip the whole layout out of view; 60% shows more context by
// default. Shared by every "default view" spot: a fresh page's own
// viewport (pagesStore.ts), and the reset-view action (both the keyboard
// shortcut and CanvasEditorPage's resetViewport) that returns to it.
export const INITIAL_VIEWPORT: Viewport = { pan: { x: 0, y: 0 }, zoom: 0.6 };

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
