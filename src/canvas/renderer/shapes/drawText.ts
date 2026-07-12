import type { TextNode } from "../../../types/scene";

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

  // A textarea naturally lets you type newlines, but fillText doesn't
  // create line breaks for embedded \n characters — draw each line
  // separately or multi-line content renders as overlapping garble.
  content.split("\n").forEach((line, index) => {
    ctx.fillText(line, x, index * lineHeight);
  });
}
