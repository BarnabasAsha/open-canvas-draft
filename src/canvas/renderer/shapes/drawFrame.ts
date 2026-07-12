import type { FrameNode, NodeId, SceneNode } from "../../../types/scene";
import { drawNode } from "../drawNode";

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  node: FrameNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  const { width, height, cornerRadius, fill, clipsContent, children } = node;

  ctx.beginPath();
  if (cornerRadius > 0) {
    ctx.roundRect(0, 0, width, height, cornerRadius);
  } else {
    ctx.rect(0, 0, width, height);
  }

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (clipsContent) {
    ctx.save();
    ctx.clip();
    drawChildren(ctx, children, nodes);
    ctx.restore();
  } else {
    drawChildren(ctx, children, nodes);
  }
}

function drawChildren(
  ctx: CanvasRenderingContext2D,
  children: NodeId[],
  nodes: Record<NodeId, SceneNode>,
): void {
  for (const childId of children) {
    const child = nodes[childId];
    if (child) drawNode(ctx, child, nodes);
  }
}
