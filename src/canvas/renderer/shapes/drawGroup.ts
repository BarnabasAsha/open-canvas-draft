import type { GroupNode, NodeId, SceneNode } from "../../../types/scene";
import { drawNode } from "../drawNode";

// No fill/border of its own, same as a section — purely organizational.
export function drawGroup(
  ctx: CanvasRenderingContext2D,
  node: GroupNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  for (const childId of node.children) {
    const child = nodes[childId];
    if (child) drawNode(ctx, child, nodes);
  }
}
