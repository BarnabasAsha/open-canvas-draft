import { getComponent } from "../../../store/componentsStore";
import { resolveInstance } from "../../../store/resolveInstance";
import type { InstanceNode } from "../../../types/scene";
import { drawNode } from "../drawNode";

// Resolves to a concrete subtree, then recurses straight back into the
// existing drawNode for its root and children — same as drawFrame/drawGroup
// recursing into real children, just over a resolved-on-the-fly subtree
// instead of one already living in the graph.
export function drawInstance(ctx: CanvasRenderingContext2D, node: InstanceNode): void {
  const definition = getComponent(node.componentId);
  if (!definition) return;

  const resolved = resolveInstance(node, definition);
  drawNode(ctx, resolved.nodes[resolved.rootId], resolved.nodes);
}
