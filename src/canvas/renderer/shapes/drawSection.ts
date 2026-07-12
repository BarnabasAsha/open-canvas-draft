import type { NodeId, SceneNode, SectionNode } from "../../../types/scene";
import { drawNode } from "../drawNode";

const LABEL_FONT = "12px sans-serif";
const LABEL_COLOR = "#9ca3af";
const LABEL_OFFSET = 4;

export function drawSection(
  ctx: CanvasRenderingContext2D,
  node: SectionNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";
  ctx.fillText(node.label, 0, -LABEL_OFFSET);

  for (const childId of node.children) {
    const child = nodes[childId];
    if (child) drawNode(ctx, child, nodes);
  }
}
