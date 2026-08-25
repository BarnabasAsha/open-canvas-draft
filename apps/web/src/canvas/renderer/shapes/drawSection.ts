import type { NodeId, SceneNode, SectionNode } from "@open-canvas/schema";
import { drawNode } from "../drawNode";

// No fill/border/label of its own — a section is purely organizational.
// Its label only shows while selected, drawn by SelectionOverlay instead
// (a React/SVG layer that already re-renders on selection changes, unlike
// this canvas raster pass, which is selection-agnostic by design).
export function drawSection(
  ctx: CanvasRenderingContext2D,
  node: SectionNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  for (const childId of node.children) {
    const child = nodes[childId];
    if (child) drawNode(ctx, child, nodes);
  }
}
