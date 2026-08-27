import { buildCssFilterString, isNeutralFilters } from "@open-canvas/commands";
import type { ImageNode } from "@open-canvas/schema";
import { getImage } from "../imageCache";

export function drawImage(ctx: CanvasRenderingContext2D, node: ImageNode): void {
  const image = getImage(node.src);
  if (!image) return;

  const { width, height, objectFit } = node;
  const { drawWidth, drawHeight, offsetX, offsetY } = fitImage(image, width, height, objectFit);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  // Scoped to this save/restore, and skipped entirely when every filter
  // is neutral — ctx.filter isn't limited to drawImage the way
  // fillStyle/strokeStyle are, so leaving it unset by default avoids any
  // risk of it leaking into a sibling's own draw call.
  if (!isNeutralFilters(node.filters)) ctx.filter = buildCssFilterString(node.filters);
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
}

function fitImage(
  image: HTMLImageElement,
  width: number,
  height: number,
  objectFit: ImageNode["objectFit"],
): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number } {
  if (objectFit === "fill") {
    return { drawWidth: width, drawHeight: height, offsetX: 0, offsetY: 0 };
  }

  const scale =
    objectFit === "contain"
      ? Math.min(width / image.width, height / image.height)
      : Math.max(width / image.width, height / image.height);

  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  return {
    drawWidth,
    drawHeight,
    offsetX: (width - drawWidth) / 2,
    offsetY: (height - drawHeight) / 2,
  };
}
