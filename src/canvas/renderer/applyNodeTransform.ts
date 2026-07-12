import type { SceneNode } from "../../types/scene";

export function applyNodeTransform(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  ctx.translate(node.x, node.y);

  if (node.rotation !== 0) {
    const pivotX = node.width / 2;
    const pivotY = node.height / 2;
    ctx.translate(pivotX, pivotY);
    ctx.rotate((node.rotation * Math.PI) / 180);
    ctx.translate(-pivotX, -pivotY);
  }
}
