# HTML export walkthrough

Select a Frame, open the new "Export" section at the bottom of the properties panel, click "Export to HTML" — a self-contained `.html` file downloads. v1 is scoped to exactly that: one frame, one file, no zip, no other formats. The section itself is deliberately its own thing rather than folded into `CssSection`, so a second export format later is just another button in the same place, not a rework.

## Why rendering happens on the server

A page's scene graph is already persisted to Postgres via the existing autosave (`PUT .../pages/:pageId/scene`) — the API already holds the authoritative data a Frame lives in, so export is a read-and-render operation that belongs in its own domain, not a browser-only concern. `POST /projects/:projectId/pages/:pageId/frames/:frameId/export/html` (`apps/api/src/modules/projects/pages/routes.ts`) loads the page through the same `loadOwnedPage` every other page route already uses, finds the frame in `page.sceneGraph.nodes`, and calls `renderFrameToHtml` from `@open-canvas/commands` — the first thing `apps/api` has ever depended on from that package (previously it only depended on `@open-canvas/schema`).

It's a `POST`, not a `GET`, for one specific reason: component instance definitions are never persisted server-side — `componentsStore.ts` is a client-only in-memory registry. If an exported frame contains an `instance` node, the server can't resolve it from Postgres alone, so the request body carries whatever `componentsStore.getState().definitions` the client already has in memory alongside the frame/page ids. The frame's own geometry still comes entirely from the server's persisted copy.

## No world-matrix flattening needed

The interactive-editing side of `packages/commands` (`graphMutations.ts`, `sceneCorners.ts`, `worldTransform.ts`) leans on `DOMMatrix`/`DOMPoint` to compose a node's full scene-space transform for hit-testing and drag-reparenting. None of that is needed here. Every node's `x`/`y`/`rotation` is already stored relative to its own immediate parent, and CSS composes nested transforms the same way nested Canvas 2D transforms already do — so `renderFrameToHtml.ts` just nests `<div>`s to match the scene graph's own parent-child structure and lets the browser do the composition. `apps/api`'s `tsconfig.json` already includes `"DOM"` in `lib`, so the `DOMMatrix` type references those other files carry (pulled in transitively through `packages/commands/src/index.ts`'s barrel export) type-check fine either way — nothing server-side ever calls them.

## Reusing `generateNodeCss`, and where it falls short

`generateNodeCss.ts` already generates most of what a node needs — size, fill/border/radius, `display:flex` and friends for a layout container, typography, image filters. It was written for the read-only CSS tab in the properties panel, though, so it never had to answer "where does this node actually sit." Two things `renderFrameToHtml.ts` has to add on top, in `positionCss()`:

- `position: absolute; left; top;` for anything that isn't a flex-flowed child of its parent — mirroring `positioning: "flow" | "absolute"` exactly as stored.
- `transform: rotate(Ndeg)` for non-zero rotation on anything except line/arrow, which already carry their own rotation via `generateNodeCss`'s own `generateLineCss` (the "rotated shaft" technique) — stacking a second transform on top of that would compose wrong.

`position` only takes one value, so a node's own placement and it being an anchor for its children's absolute positioning are mutually exclusive, not additive — `position: absolute` already establishes a containing block for its own descendants, so nothing also gets `position: relative` on top of it. That was a real bug caught during testing (see below), not a hypothetical.

The other real gap: `generateNodeCss` treats any `fill`/`stroke` field as a rectangular background/border, which is correct for every node type except `path` — a path's actual shape is a bezier curve, not a box, so `nodeOwnCss()` strips the `background:`/`border:` lines it would otherwise wrongly add there. Path is rendered as its own inline `<svg>` instead (see below), so those declarations would just paint a wrong solid rectangle behind the real shape.

## What genuinely needed new code

`nodeToHtmlElement.ts` mirrors `apps/web/src/canvas/renderer/nodeKinds.ts`'s exhaustive mapped-type pattern (one entry per `SceneNode["type"]`, so a new node variant without a matching entry fails to compile) but produces an `{tag, attrs, extraCss, innerHtml}` spec instead of Canvas 2D draw calls. Most types map to `<div>` (or `semantics.tag` when a node was authored with one); `image` maps to `<img src>`; line/arrow need nothing beyond what `generateNodeCss` already produces (arrows render shaft-only, no arrowhead — a named v1 scope limit `generateNodeCss` itself already documents).

`path` is the one node genuinely needing new geometry code — `buildPathD()` converts stored bezier points into an SVG `d` string, mirroring `tracePathSegment` in `apps/web/src/canvas/renderer/shapes/drawPath.ts` exactly (same handle semantics: `handleOut`/`handleIn` are absolute control-point positions, not offsets) but emitting SVG path commands instead of `Path2D` calls, since `Path2D` is exactly as browser-only as the `DOMMatrix` APIs this exporter was built to avoid needing.

Component instances resolve through the existing `resolveInstance()` — its own doc comment already anticipated this exact use ("the existing drawNode/hitTestScene recursion — and, later, an HTML/React exporter — can walk it with no special cases"). An instance renders as a wrapper `<div>` carrying the *instance's* own position/rotation/size, containing the resolved definition root rendered at its already-zeroed local `(0,0)` — `resolveInstance`'s `placeRoot` sizes that root to the instance's own width/height, so it overlays the wrapper exactly.

Text content and every HTML attribute value are escaped (`escapeHtml()`) before being embedded — this is user-authored content going into a static file that could be opened or hosted anywhere, not somewhere to trust it verbatim.

CSS classes are named by render order (`n0`, `n1`, ...) rather than by node id — virtual instance-child ids (`instanceVirtualId.ts`) aren't guaranteed to be valid unescaped CSS identifiers, and a plain counter sidesteps that question entirely.

## Fonts

`GOOGLE_FONTS` (the curated whitelist `TypographySection`'s font picker already offered) moved from `apps/web/src/utils/googleFonts.ts` into `packages/commands/src/googleFonts.ts`, alongside a new `buildGoogleFontsUrl()` — both the frontend's live font loading and the server-side exporter need the exact same whitelist and URL shape. `renderFrameToHtml` collects the distinct `fontFamily` values actually used by text nodes in the exported subtree, filters to the Google-listed ones, and links exactly those in one `<link>` tag — nothing exported ever tries to link a generic keyword like `"serif"` or a system font like `"Georgia"` as if it were a Google Font.

## Verified

Ran `renderFrameToHtml` directly against a synthetic scene covering every case at once — a flex row of two rects, an absolutely-positioned rotated ellipse, heading text in a Google-listed font, an image, an absolutely-positioned path (a triangle), a nested group with an absolutely-positioned text overlay, and a component instance — and opened the output file directly in a real browser (no dev server). Caught and fixed three real bugs this way before they'd have shipped:

- The path rendered as a solid square (`generateNodeCss`'s leaked `background`) instead of the triangle its points describe.
- The component instance rendered in the wrong place entirely — stuck in normal flex flow instead of at its own absolute position — because the wrapper never got `positionCss` applied to it at all.
- A real exported frame overflowed its own declared width in a browser. Two compounding causes, both now fixed with a small reset block in the document `<head>`: the browser's default `body` margin adds extra size on top of the frame's own, and — the bigger one — any container with both an explicit `width`/`height` and padding (the frame itself, here) rendered *wider than declared* under the browser's default `content-box` box model; `box-sizing: border-box` on every element fixes that. Confirmed via `getBoundingClientRect()` that the frame now renders at exactly its declared size with no scroll overflow at a viewport wider than the frame.

Confirmed the Google Fonts `<link>` actually applies (`getComputedStyle` on the heading reports `font-family: Poppins`, not a fallback). `pnpm -r typecheck` and root `pnpm lint` both clean throughout.

A frame authored wider than the browser window viewing the export will still show a horizontal scrollbar — that's inherent to a fixed-size artboard (nothing in the node model encodes responsive/fluid reflow), not a bug.

Not verified: the full authenticated path through the actual UI (click the button in a running app, confirm the browser download) — that requires a real signed-in session (Google OAuth), which isn't something this pass could drive headlessly. The route itself, the DI wiring, and the rendering logic it calls are all covered above; what's unverified is specifically the browser-download mechanics (`downloadTextFile`'s `Blob`/`<a download>` handling) and the click-through from the properties panel.

## What's deliberately out of scope for this pass

- **Exporting a whole page/project as a zip of per-frame files** — the natural v2, once v1's transport (`POST .../export/html`) is proven; extending it to accept multiple frame ids is a small addition, not a rework.
- **Any export format other than HTML** — the properties-panel "Export" section exists specifically so a second button/format later doesn't need restructuring.
- **Persisting component definitions server-side** — a separate, larger feature. Today's workaround (the client sends what it already has in memory) is a real limitation: exporting a frame containing an instance whose definition the client doesn't currently have loaded renders an HTML comment placeholder instead of the actual content.
- **Arrowheads in exported HTML** — `generateNodeCss` already renders arrows shaft-only (documented there, not introduced by this pass); a real arrowhead would need a generated pseudo-element triangle with no direct single-element CSS equivalent.
