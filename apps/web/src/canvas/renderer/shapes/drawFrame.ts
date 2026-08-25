import type { FrameNode, NodeId, SceneNode } from "@open-canvas/schema";
import { drawNode } from "../drawNode";
import { buildRectGeometry } from "./drawRect";
import { applyStrokeStyle } from "./strokeStyle";

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  node: FrameNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  const { fill, stroke, strokeWidth, strokeStyle, clipsContent, children } = node;
  const path = buildRectGeometry(node);

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }

  if (clipsContent) {
    ctx.save();
    ctx.clip(path);
    drawChildren(ctx, children, nodes);
    ctx.restore();
  } else {
    drawChildren(ctx, children, nodes);
  }

  // Drawn last, outside any clip — a border should read as a full-width
  // ring around the frame, not have its outer half clipped away along with
  // whatever content spills past the edge.
  if (stroke && strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    applyStrokeStyle(ctx, strokeStyle, strokeWidth);
    ctx.stroke(path);
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
