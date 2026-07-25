# Ruler and gridlines walkthrough

A ruler along the top and left edges of the canvas, and a toggleable grid behind scene content. Different from most features in this app so far in one way: nothing here touches the scene graph or a single node — it's the first feature that's purely about *reading* the viewport, not editing anything in it.

## One shared algorithm, two different renderers

The core problem both features share: at any given zoom level, what scene-space spacing between marks actually reads as useful? Too fine and it's noise; too coarse and it's useless. `src/canvas/rulerTicks.ts` solves this once, for both:

```ts
export function computeTickStep(zoom: number, targetSpacingPx = TARGET_TICK_SPACING_PX): number {
  const rawStep = targetSpacingPx / zoom;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  for (const multiplier of NICE_MULTIPLIERS) { // [1, 2, 5]
    const step = multiplier * magnitude;
    if (step >= rawStep) return step;
  }
  return 10 * magnitude;
}
```

This is the standard chart-axis-tick algorithm — pick the smallest "nice" number (1, 2, or 5 × a power of ten) that keeps on-screen spacing near a target (80px). At 100% zoom that's a 100-unit step; zoom to 173% and it tightens to 50; zoom out to 58% and it opens up to 200. Confirmed directly in the browser across all three.

Because `drawGrid.ts` (the raster grid) and `rulerTicks.ts`'s `computeRulerTicks` (the ruler's tick positions) both call this same function, the grid lines always land exactly on the ruler's tick marks — they were never at risk of drifting apart, because there's only one place the step is decided.

## The ruler is an overlay, not a canvas

Everything about *scene content* in this app draws to the raster canvas, redrawn imperatively on store changes (per the "no `useEffect` for canvas drawing driven by re-renders" rule). The ruler isn't scene content — it's UI chrome describing the viewport, the same category `SelectionOverlay` and `TextEditOverlay` already occupy. So `Ruler.tsx` follows their precedent instead: a normal React component reading `useViewport()`/`useCanvasSize()` directly and re-rendering the ordinary way, built from SVG `<line>`/`<text>` elements rather than `ctx.fillText`.

One detail carried over from earlier bug-hunting this session: SVG presentation attributes don't resolve `var()` — only the `style` prop does, since that's genuine CSS and plain attributes aren't. Every themed color on the ruler goes through `style={{ stroke: "var(--text-muted)" }}`, not a bare `stroke=` attribute, for the same reason `SelectionOverlay`'s stroke/fill already had to be fixed this way.

## The grid *is* canvas content — and needs its own color-resolution step

The grid is the opposite case: it has to pan and scale exactly with scene content, so it draws inside `drawScene.ts`'s already-transformed context, in `drawGrid.ts`, using the same `ctx.translate`/`ctx.scale` every node already renders through. That means it hits a different version of the same CSS-variable problem — Canvas 2D's `ctx.strokeStyle` isn't CSS at all, so `var(--grid-line)` as a literal string does nothing. `drawGrid` reads the token explicitly:

```ts
ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--grid-line").trim();
```

`--grid-line` itself is deliberately *not* overridden per light/dark theme the way every other token is — it draws over the document's own canvas background, which the user can set to anything regardless of app theme, so a mid-tone gray at low opacity (`oklch(60% 0.01 265 / 16%)`) was chosen to read reasonably against either a light or dark page, rather than tuning it to the app chrome's own surfaces.

Line width is set to `1 / viewport.zoom` — a fixed *scene-space* value that resolves to exactly 1 screen pixel regardless of zoom, the same "constant on-screen size" trick already established for resize-handle hit radii back in the zoom/pan work.

## Layout: the ruler needed real space, not an overlap

Unlike `SelectionOverlay`, which floats on top of the canvas with `pointer-events: none`, a ruler that overlapped canvas content would permanently hide whatever's underneath its own strip. `App.tsx`'s canvas area is now a small CSS grid — a 20px corner box, a 20px-tall horizontal ruler, a 20px-wide vertical ruler, and the actual canvas viewport occupying the remaining cell — instead of the plain single `flex: 1` div it was before. The canvas viewport div (with `Canvas`/`SelectionOverlay`/`TextEditOverlay`/`Toolbar`/`ZoomIndicator` inside it, `position: relative` as its own positioning context) is unchanged internally; it just now lives in one grid cell instead of being the whole area, with `minWidth: 0; minHeight: 0` to stop it overflowing its cell the same way `minWidth: 0` was already needed to stop it overflowing its flex slot.

## Both toggles: document settings, not node edits

`gridVisible` (and, added right after this walkthrough first shipped, `rulerVisible`) joined `backgroundColor` in `documentStore` rather than becoming a node property or a `historyManager`-tracked change — same reasoning that already applied to background color: rarely-changed, trivially-reversible global settings, not scene data worth an undo step. Both are wired to a plain `CheckboxField` (a small extraction from `ColorField`'s bundled checkbox, first used standalone for the grid toggle) in `DocumentSection`, plus keyboard shortcuts matching Figma's own bindings — Cmd/Ctrl+' for the grid, Shift+R for the ruler.

The ruler's toggle needed one more piece the grid's didn't: hiding the grid is just skipping a draw call, but the ruler occupies real grid-layout space (see above), so hiding it means collapsing that space too, not just not rendering the `<Ruler>` component:

```tsx
const rulerSize = documentSettings.rulerVisible ? RULER_SIZE : 0;
// ...
gridTemplateColumns: `${rulerSize}px 1fr`,
gridTemplateRows: `${rulerSize}px 1fr`,
```

Collapsing the track to `0px` and conditionally rendering `<Ruler />` together means the canvas viewport cell (which is already sized as the grid's remaining `1fr` track) reclaims that space automatically — no separate "full width" layout branch needed.

## Verified

Checked the ruler/grid together at three zoom levels (100%, 173%, 58%) via Playwright screenshots — tick step adapts correctly at each (100 → 50 → 200), grid lines visibly align with ruler ticks at every level, and panned-out negative coordinates (down to -200) render correctly on both. Toggled the grid both via the checkbox and the keyboard shortcut, confirming they stay in sync (both read/write the same `documentStore` field). Separately verified the ruler toggle: checkbox off removes the ruler and its layout space cleanly (no gap, canvas viewport reclaims the full area), Shift+R brings it back and updates the checkbox to match, and confirmed Shift+R doesn't also trigger the rectangle tool (a real risk, since plain "R" already does). No console errors.

## What's deliberately out of scope for this pass

- **Grid snapping** — the grid is visual only; dragging a shape doesn't snap to it. A real, separate feature layered on top later if wanted, not bundled in for free.
- **Rotated vertical-ruler labels** — Figma rotates its vertical ruler's numbers 90° to read top-to-bottom; this pass renders them unrotated (small horizontal numbers), which stayed legible at every scale tested but is a conscious simplification, not an oversight.
- **Cursor/selection position indicators on the ruler** — Figma highlights the current selection's extent on the ruler itself and tracks the live cursor position. Both are real, contained follow-ups (the data — selection bounds, pointer position — already exists elsewhere in the app), just not part of this pass.
- **A configurable grid size** — one fixed step (shared with the ruler's own algorithm) rather than a user-adjustable spacing setting.
