// Splits on explicit newlines first (hard breaks), then greedily packs
// words onto each line up to maxWidth — ctx.font must already be set to
// the node's font before calling this, since measureText reads it.
export function wrapText(ctx: CanvasRenderingContext2D, content: string, maxWidth: number): string[] {
  return content.split("\n").flatMap((paragraph) => wrapParagraph(ctx, paragraph, maxWidth));
}

function wrapParagraph(ctx: CanvasRenderingContext2D, paragraph: string, maxWidth: number): string[] {
  const words = paragraph.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (const word of words.slice(1)) {
    const candidate = `${currentLine} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  lines.push(currentLine);
  return lines;
}
