import type { TextNode } from "@open-canvas/schema";
import { applyTextFontState, wrapText } from "./wrapText";

export function drawText(ctx: CanvasRenderingContext2D, node: TextNode): void {
  const { width, fontSize, content, color, align, lineHeight, textDecoration } = node;

  applyTextFontState(ctx, node);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;

  const x = align === "center" ? width / 2 : align === "right" ? width : 0;
  const lineHeightPx = fontSize * lineHeight;

  // A textarea naturally lets you type newlines and wraps long lines to
  // its own width, but fillText does neither on its own — wrapText mirrors
  // both so the committed render matches what was visible while editing.
  // ctx.letterSpacing is already set above, so wrapText's own measureText
  // calls account for it automatically — it's canvas state, not an argument.
  const lines = wrapText(ctx, content, width);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, index * lineHeightPx);
  });

  if (textDecoration !== "none") {
    drawTextDecoration(ctx, lines, x, align, fontSize, lineHeightPx, textDecoration, color);
  }
}

// Canvas has no font-level underline/strikethrough — the line has to be
// measured and drawn by hand, once per wrapped line since each one can be a
// different width (and, under center/right alignment, start at a different
// x) depending on how much text actually landed on it.
function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  align: TextNode["align"],
  fontSize: number,
  lineHeightPx: number,
  textDecoration: "underline" | "line-through",
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, fontSize * 0.05);

  const decorationY = textDecoration === "underline" ? fontSize * 0.92 : fontSize * 0.5;

  ctx.beginPath();
  lines.forEach((line, index) => {
    const lineWidth = ctx.measureText(line).width;
    const lineStartX = align === "center" ? x - lineWidth / 2 : align === "right" ? x - lineWidth : x;
    const y = index * lineHeightPx + decorationY;
    ctx.moveTo(lineStartX, y);
    ctx.lineTo(lineStartX + lineWidth, y);
  });
  ctx.stroke();
  ctx.restore();
}
