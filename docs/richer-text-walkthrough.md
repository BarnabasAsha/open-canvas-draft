# Richer text properties walkthrough

`TextNode` grows four fields — `fontStyle`, `letterSpacing`, `lineHeight`, `textDecoration` — and the font list stops being five generic families and starts being real Google Fonts, loaded on demand. The interesting part is less the new fields themselves (each one is the same shape as fields already in this app) and more the two things that don't fit that pattern: drawing an underline by hand, and a font that might not exist yet at the moment it's first drawn.

## Four new fields, zero new patterns

`fontStyle`/`letterSpacing`/`lineHeight`/`textDecoration` each slot into `TypographySection` exactly like `fontWeight`/`align` already did — a `SelectField` or `NumberField`, a patch object, `onFocus`/`onChange`/`onCommit`. `lineHeight` used to be a single shared constant (`LINE_HEIGHT_MULTIPLIER`, `1.2`) referenced by both `drawText.ts` and `TextEditOverlay.tsx` so the committed render and the live-editing textarea stayed in sync; now that it's a per-node field instead, both read `node.lineHeight` directly and the shared constant is gone — same "stay in sync" property, just because they're now reading the same *data* instead of the same *constant*.

## Canvas has no italic/underline built in — only the parts that survive `ctx.font`

`fontStyle` was easy: `ctx.font` already accepts a leading style keyword (`"italic 400 16px sans-serif"`), so it's one string interpolation. `letterSpacing` was easier still — modern Canvas 2D has a real `ctx.letterSpacing` property, and because it's canvas *state* (like `ctx.font` itself), setting it once before `wrapText`'s `measureText` calls means wrapping already accounts for it correctly with no changes to `wrapText.ts` at all.

`textDecoration` is the one that needed real work. There's no canvas font property for underline or strikethrough — the line has to be measured and drawn by hand, once per wrapped line, since each line can be a different width (and, under center/right alignment, start at a different x) depending on how much text actually landed on it:

```ts
function drawTextDecoration(ctx, lines, x, align, fontSize, lineHeightPx, textDecoration, color) {
  const decorationY = textDecoration === "underline" ? fontSize * 0.92 : fontSize * 0.5;
  lines.forEach((line, index) => {
    const lineWidth = ctx.measureText(line).width;
    const lineStartX = align === "center" ? x - lineWidth / 2 : align === "right" ? x - lineWidth : x;
    ...
  });
}
```

This reuses the exact same `lines` array `drawText` already computed for `fillText` — no second call to `wrapText`, just a second pass over the same wrapped output.

## A font that isn't loaded yet doesn't error — it just silently isn't there

The five original families (`sans-serif`, `serif`, `monospace`, `Georgia`, `'Courier New'`) are all fonts a browser already has; picking one just works. A Google Font is a network fetch, and the moment between "user picked it" and "the bytes actually arrived" is real — `ctx.fillText` doesn't wait or error on a missing font, it just silently substitutes a fallback, so drawing at the wrong instant would show the wrong typeface with no signal that anything's off.

`googleFonts.ts`'s `loadGoogleFont` is the trigger — called only from `TypographySection`'s font `onChange`, not proactively for every entry in the list, so switching families doesn't fetch 27 fonts just for being visible in a dropdown:

```ts
export function loadGoogleFont(family: string): void {
  if (loadedFamilies.has(family)) return;
  loadedFamilies.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
```

The other half is knowing when it's *safe* to redraw with the new font. `Canvas.tsx` now listens for the browser's own `document.fonts` `loadingdone` event — fired whenever any font anywhere on the page finishes loading — and just calls `render()`:

```ts
document.fonts.addEventListener("loadingdone", render);
```

This is broader than "the one font this canvas actually asked for" (it fires for any font, from anywhere), but redrawing on an unrelated font's load is harmless — it's the same canvas, the same `render` closure every other store subscription already calls, and it means the canvas doesn't need to track which specific families are in flight or match them up itself. Verified directly: picked "Playfair Display" (a serif) for a sans-serif-default text node, watched the actual `fonts.googleapis.com` request fire, and confirmed the canvas visibly re-rendered in the serif typeface once it arrived — not immediately, and not requiring any other store change to trigger the follow-up redraw.

## Not the full Google Fonts catalog — and that's a deliberate, not a temporary, scope line

Google's font-*metadata* API (the one that lists all ~1800 families) needs an API key this project doesn't have. Google's font-*serving* endpoint (the one `loadGoogleFont` actually calls) doesn't — you can request any real family's `@font-face` rules by name with no key at all. `googleFonts.ts`'s `GOOGLE_FONTS` list is a curated ~27-family shortlist rather than a live search over the whole catalog, which sidesteps needing that key entirely: "load a specific font on demand" and "browse/search every font that exists" turned out to be two separate problems, and only the second one is blocked. Extending the list later is a one-line addition per font, no architecture change.

## Verified

Created a text node, confirmed all seven typography fields render (`Font`, `Size`, `Weight`, `Style`, `Line height`, `Letter spacing`, `Decoration`, `Align`, `Color`), set Style→Italic and Decoration→Underline and confirmed both visibly applied to the canvas text together, then picked a Google Font and confirmed via network inspection that the correct `fonts.googleapis.com` URL fired exactly once, and that the canvas re-rendered in the new (visibly serif) typeface once it loaded. No console errors throughout.

## A bug found along the way, unrelated to this phase's own work

While checking the new Style/Decoration dropdowns, they displayed raw values ("normal", "none") instead of their labels — and so did `Weight`/`Align`, which predate this phase entirely. Base UI's `Select.Value` renders the raw selected value verbatim unless given a `children` render-prop to map it to a label; `fields.tsx`'s shared `SelectField` never had one. Fixed in the one shared component (`options.find((option) => option.value === current)?.label`), which corrected every `SelectField` in the app at once, not just the new ones this phase added.

## What's deliberately out of scope for this pass

- **True rich text** (different styling per word/character within one text block) — this phase is uniform-per-node properties only, the smaller of the two readings from the original scoping conversation. Per-run styling needs `TextNode.content` to become structured runs instead of a plain string, a real data-model change touching the renderer, the text-edit overlay, and hit-testing — a distinct, larger phase, not bundled in here.
- **A searchable font combobox** — the current `SelectField` is a plain dropdown; fine at ~30 entries, would want a filter/search input if the curated list grows much larger or the full catalog gets wired in later.
- **Icon-button toggles for Bold/Italic/Underline** (matching Figma's B/I/U row) instead of dropdowns — a polish pass consistent with the checkbox/layers-panel work from the design-system phase, not done here to keep this phase's scope to the data model and rendering.
