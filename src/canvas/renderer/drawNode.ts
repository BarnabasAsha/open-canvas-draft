import type { NodeId, SceneNode } from "../../types/scene";
import { applyNodeTransform } from "./applyNodeTransform";
import { nodeKinds } from "./nodeKinds";

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  if (!node.visible) return;

  ctx.save();
  applyTransform(ctx, node);
  // nodeKinds is keyed by SceneNode["type"], so TS can't correlate the
  // lookup back to node's already-narrowed type on its own — one cast here
  // stands in for what used to be zero safety across every case of a
  // switch statement with no exhaustiveness check.
  nodeKinds[node.type].draw(ctx, node as never, nodes);
  ctx.restore();
}

function applyTransform(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  applyNodeTransform(ctx, node);
  ctx.globalAlpha *= node.opacity;
}
