import type { SceneGraph } from "../../types/scene";
import { drawNode } from "./drawNode";

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: SceneGraph,
  width: number,
  height: number,
  backgroundColor: string | null,
): void {
  ctx.clearRect(0, 0, width, height);
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  for (const id of scene.rootIds) {
    const node = scene.nodes[id];
    if (node) drawNode(ctx, node, scene.nodes);
  }
}
