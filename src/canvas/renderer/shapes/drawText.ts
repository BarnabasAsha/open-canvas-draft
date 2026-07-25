import type { TextNode } from "../../../types/scene";
import { wrapText } from "./wrapText";

// Shared with TextEditOverlay's CSS line-height so the committed render and
// the live editing textarea line up as closely as browser font metrics
// allow (canvas fillText and a native textarea never match pixel-perfectly).
export const LINE_HEIGHT_MULTIPLIER = 1.2;

export function drawText(ctx: CanvasRenderingContext2D, node: TextNode): void {
  const { width, content, fontSize, fontFamily, fontWeight, color, align } = node;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;

  const x = align === "center" ? width / 2 : align === "right" ? width : 0;
  const lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER;

  // A textarea naturally lets you type newlines and wraps long lines to
  // its own width, but fillText does neither on its own — wrapText mirrors
  // both so the committed render matches what was visible while editing.
  wrapText(ctx, content, width).forEach((line, index) => {
    ctx.fillText(line, x, index * lineHeight);
  });
}
