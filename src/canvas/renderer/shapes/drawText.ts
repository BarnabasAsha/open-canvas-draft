import type { TextNode } from "../../../types/scene";

export function drawText(ctx: CanvasRenderingContext2D, node: TextNode): void {
  const { width, content, fontSize, fontFamily, fontWeight, color, align } = node;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.textAlign = align;

  const x = align === "center" ? width / 2 : align === "right" ? width : 0;
  ctx.fillText(content, x, 0);
}
