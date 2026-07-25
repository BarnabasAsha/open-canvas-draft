import type { SceneGraph } from "../../types/scene";
import type { Viewport } from "../../utils/coordinates";
import { drawGrid } from "./drawGrid";
import { drawNode } from "./drawNode";

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: SceneGraph,
  width: number,
  height: number,
  backgroundColor: string | null,
  viewport: Viewport,
  gridVisible: boolean,
): void {
  // Background fill happens in plain (DPR-only) canvas space, before the
  // viewport transform, so it always covers the full visible area exactly
  // once regardless of zoom — content is what pans/scales, not the page
  // itself.
  ctx.clearRect(0, 0, width, height);
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.translate(viewport.pan.x, viewport.pan.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  if (gridVisible) drawGrid(ctx, viewport, width, height);

  for (const id of scene.rootIds) {
    const node = scene.nodes[id];
    if (node) drawNode(ctx, node, scene.nodes);
  }

  ctx.restore();
}
