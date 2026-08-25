import type { StrokeStyle } from "@open-canvas/schema";

// Every stroked shape calls this right before ctx.stroke(path) — since it
// always sets an explicit dash array (including clearing it for "solid"),
// no shape has to worry about a previous shape's dash state leaking into
// its own, regardless of draw order.
export function applyStrokeStyle(ctx: CanvasRenderingContext2D, strokeStyle: StrokeStyle, strokeWidth: number): void {
  if (strokeStyle === "dashed") {
    ctx.setLineDash([strokeWidth * 3, strokeWidth * 2]);
    ctx.lineCap = "butt";
  } else if (strokeStyle === "dotted") {
    // A zero-length dash with a round cap renders as a dot, not a stroke —
    // the standard canvas trick for a true dotted (as opposed to dashed)
    // line.
    ctx.setLineDash([0, strokeWidth * 2.2]);
    ctx.lineCap = "round";
  } else {
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
  }
}
