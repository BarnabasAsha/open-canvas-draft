# Frame stroke walkthrough

Frame gained `stroke`/`strokeWidth`, matching Rect/Ellipse/Path — and every stroke-bearing node (those three, plus Line and Arrow, plus now Frame) gained a `strokeStyle: "solid" | "dashed" | "dotted"` alongside it, rendered through one small shared helper.

## Frame, but deliberately not Section

The question that started this: should a container have a border? For Frame, yes — a Frame is already essentially a Rect that can hold children (it has `fill`/`cornerRadius`, just like Rect), so a bordered card or outlined panel is exactly the kind of thing it should support, and `StrokeSection` already existed to reuse.

Section was deliberately left out. Its whole identity so far has been "purely organizational, no visual properties of its own" — matching Figma's own Section, which never renders fill or stroke as scene content, only a dashed outline when it happens to be selected. Giving it a stroke would blur the one thing that currently tells Frame and Section apart.

## Drawing a Frame's border outside its own clip

`drawFrame.ts` draws fill, then (if `clipsContent`) clips and draws children, then restores — and only *after* that draws the stroke:

```ts
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
```

A canvas stroke straddles its path evenly (half inside, half outside) — if it were drawn *inside* the `ctx.clip()` block like the fill and children are, the clip region would cut off the outer half of the border along with any overflowing content, leaving a border that's visibly thinner on a clipped frame than an unclipped one at the same `strokeWidth`. Stroking after `ctx.restore()` (back to the unclipped context) avoids that asymmetry entirely.

`buildRectGeometry` (already shared with `drawRect.ts` for the rounded-or-square path) gets reused here too — Frame's fill, clip, and stroke all trace the exact same `Path2D`, so there's no way for the border to end up not-quite-matching the frame's own rounded corners.

## One shared helper for dashed/dotted, used by all six stroke draws

Every stroke-bearing shape (`drawRect`, `drawEllipse`, `drawPath`, `drawLine`, `drawArrow`, and now `drawFrame`) calls the same function immediately before `ctx.stroke()`:

```ts
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
```

The dotted case is the one worth remembering: a dash array of `[0, gap]` draws zero-length dash segments, which by themselves would be invisible — giving the line a `round` cap turns each zero-length segment into a filled circle instead, producing actual round dots rather than tiny rectangular dashes. Dash length and gap both scale with `strokeWidth` rather than being fixed pixel values, so a thick dashed border doesn't end up with dashes that look disproportionately short next to it.

Because every shape calls this unconditionally (including the `"solid"` branch, which explicitly clears any dash state), no shape needs to worry about a previous shape's dash pattern leaking into its own via leftover canvas context state — each stroke draw is self-contained regardless of what was drawn immediately before it.

## Verified

Set a Frame's stroke to 8px dashed, then dotted, and screenshotted a zoomed crop of its top edge for each — dashed shows even dash segments, dotted shows genuine round dots (not short dashes), both against the frame's own fill. Confirmed the Style field appears in `StrokeSection` for a Frame alongside Color/Width, matching Rect/Ellipse/etc. No console errors.

## What's deliberately out of scope for this pass

- **Section stroke/fill** — see above; kept deliberately without visual properties to preserve the Frame/Section distinction.
- **Per-side stroke** (top/right/bottom/left independently) — every stroked shape here has one uniform border; a CSS-style per-edge border is a different, larger feature.
- **Custom dash patterns** — only the two presets (dashed, dotted) plus solid; an arbitrary dash-array editor wasn't asked for and would be a lot of UI for a rarely-needed case.
