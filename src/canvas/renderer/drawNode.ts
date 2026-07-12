import type { NodeId, SceneNode } from "../../types/scene";
import { applyNodeTransform } from "./applyNodeTransform";
import { drawArrow } from "./shapes/drawArrow";
import { drawEllipse } from "./shapes/drawEllipse";
import { drawFrame } from "./shapes/drawFrame";
import { drawImage } from "./shapes/drawImage";
import { drawLine } from "./shapes/drawLine";
import { drawPath } from "./shapes/drawPath";
import { drawRect } from "./shapes/drawRect";
import { drawSection } from "./shapes/drawSection";
import { drawText } from "./shapes/drawText";

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  nodes: Record<NodeId, SceneNode>,
): void {
  if (!node.visible) return;

  ctx.save();
  applyTransform(ctx, node);

  switch (node.type) {
    case "rect":
      drawRect(ctx, node);
      break;
    case "ellipse":
      drawEllipse(ctx, node);
      break;
    case "line":
      drawLine(ctx, node);
      break;
    case "arrow":
      drawArrow(ctx, node);
      break;
    case "image":
      drawImage(ctx, node);
      break;
    case "text":
      drawText(ctx, node);
      break;
    case "path":
      drawPath(ctx, node);
      break;
    case "frame":
      drawFrame(ctx, node, nodes);
      break;
    case "section":
      drawSection(ctx, node, nodes);
      break;
  }

  ctx.restore();
}

function applyTransform(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  applyNodeTransform(ctx, node);
  ctx.globalAlpha *= node.opacity;
}
