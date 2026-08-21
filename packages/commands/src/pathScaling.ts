import type { PathPoint } from "@open-canvas/schema";

// Duplicated (not shared) from apps/web's canvas/tools/resizeMath.ts: that
// file's other exports (resizeBBoxNode, resizeEndpointNode, ...) are
// interactive drag-resize code that stays in apps/web, so moving the whole
// file here would pull screen-interaction concerns into a portable
// package. This one function is genuinely pure graph math — needed by
// resolveInstance.ts's uniform-scale step — so it's duplicated rather than
// left as a one-off cross-package import for a single small function.
export function scalePathPoints(points: PathPoint[], scaleX: number, scaleY: number): PathPoint[] {
  return points.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
    handleIn: point.handleIn ? scalePoint(point.handleIn, scaleX, scaleY) : undefined,
    handleOut: point.handleOut ? scalePoint(point.handleOut, scaleX, scaleY) : undefined,
  }));
}

function scalePoint(point: { x: number; y: number }, scaleX: number, scaleY: number): { x: number; y: number } {
  return { x: point.x * scaleX, y: point.y * scaleY };
}
