# Phase 2 & 3 walkthrough

Selection, move, and resize — how the code fits together, and which parts were tricky.

## The shape of the system

Everything sits in four layers that only talk to each other in one direction:

```
stores (data)  →  tools (pointer events → store writes)  →  geometry (pure math)  →  render (pixels/DOM)
```

- **Stores** (`sceneStore`, `selectionStore`, `viewportStore`) are the only place state lives.
- **Tools** (`selectTool`) are the only thing allowed to call `.update()` on a store.
- **Geometry modules** (`hitTest.ts`, `resizeHandles.ts`, `resizeMath.ts`, `selectionBounds.ts`) are pure functions — given a scene and a point, return an answer, touch nothing.
- **Render** (`Canvas.tsx`'s imperative draw loop, `SelectionOverlay.tsx`'s SVG) just reads state and paints it.

Keeping the geometry pure is what let Phase 3 reuse Phase 2's code instead of duplicating it — that's the throughline worth noticing when re-reading this.

## Phase 2

**`store/createStore.ts`** — a generic `{getState, update, subscribe}` factory built from closures, not a class. `sceneStore` moved onto it too once `selectionStore`/`viewportStore` needed the identical shape (three copies of the same code is when a helper stops being premature). Closures matter specifically because `useSyncExternalStore(store.subscribe, store.getState)` needs bare function references — a class method passed that way loses its `this`.

**`utils/coordinates.ts`** — `screenToScene`/`sceneToScreen`. Trivial math (`scene = (screen - pan) / zoom`), but the *point* of it is architectural: every pointer handler converts to scene space immediately, so nothing downstream (hit-testing, dragging, resize math) ever has to think about the viewport again.

**`canvas/tools/hitTest.ts` — the first genuinely tricky one.** The task was "given a scene point, which node did you click." It uses `Path2D` + `ctx.isPointInPath(path, x, y)`, and the non-obvious part is what coordinate space `x, y` is in. It's *not* local to the path — it's whatever space the canvas's *current transform* outputs into. So the trick is: walk the tree top-down exactly like the renderer does (`ctx.save()`, `ctx.translate/rotate` per node), and at each node just call `isPointInPath(localShapePath, scenePoint.x, scenePoint.y)` — the already-applied transform does the work of mapping the scene point into that node's local frame for you. This was easy to get backwards on first guess; confirmed empirically with a small probe script rather than trusted from memory. The traversal itself also encodes "topmost wins": siblings are checked in *reverse* order (last-drawn = topmost, checked first), and within a container, children are checked before the container's own body, matching paint order.

**`canvas/tools/selectTool.ts`** — the pointer-event orchestrator. Click replaces the selection; shift-click toggles a node in/out of a `Set`; dragging an *already-selected* node moves the whole group, not just the one you grabbed. The move itself snapshots each node's starting position at `pointerdown` and computes `newPos = start + (current - dragStart)` on every `pointermove`, rather than accumulating small deltas — this avoids floating-point drift and, more importantly, made a later bug fixable in one place: because the snapshot captures the *whole node* (not just `{x, y}`), `translateNode` could special-case "also shift `x2/y2` for line/arrow" without touching the orchestration logic at all.

**`canvas/selectionBounds.ts`** — `getWorldMatrix` walks a node's `parentId` chain from itself up to the root, then composes a `DOMMatrix` root-first (`translate` then `rotate-around-center`, same formula as the renderer, just expressed with matrices instead of `ctx` calls). This is what lets the selection outline sit correctly on a node that's both rotated *and* nested inside a frame — you need the *product* of every ancestor's transform, not just the node's own.

**`canvas/SelectionOverlay.tsx`** — a separate SVG layer, deliberately allowed to be React-driven (`useSyncExternalStore` hooks, re-renders normally) even though the project's rule is "no `useEffect`-driven canvas redraws." That rule exists because redrawing a busy canvas on every React render is expensive; an outline SVG with a handful of elements isn't, so the exception is safe.

**`canvas/Canvas.tsx` wiring** — `e.nativeEvent.offsetX/offsetY` gives coordinates relative to the canvas element itself, which only equals "page coordinates" if the canvas happens to sit at the page's top-left. Ours doesn't (the body centers it) — a test script clicking raw page coordinates once missed a small shape entirely because of exactly this. `setPointerCapture` on `pointerdown` is what keeps `pointermove`/`pointerup` firing even if the cursor leaves the canvas mid-drag.

## Phase 3

**`canvas/tools/resizeHandles.ts`** — computes 8 corner/edge points for most shapes (via the *full* world matrix, so handles sit correctly on rotated/nested nodes) or 2 endpoint points for line/arrow (via the *ancestor-only* matrix, deliberately ignoring the node's own rotation — more on why below). It reuses `getWorldMatrix` rather than re-deriving transform math a third time.

**`canvas/tools/resizeMath.ts` — the hardest file in either phase.** The problem: dragging a handle on a *rotated* shape needs to grow the shape along its own tilted edges, not along the screen's horizontal/vertical axes — otherwise the box skews into a parallelogram instead of staying rectangular. The fix is `getBBoxLocalPoint`, which takes the raw scene pointer and un-rotates it around the shape's center *before* doing any width/height math, so from that point on the problem is simple axis-aligned arithmetic again. The `resizeAxis` helper is the other neat bit: `size = |pointer - fixedEdge|; origin = min(pointer, fixedEdge)` — that single min/abs pair is what makes dragging a handle *past* the opposite corner flip the box cleanly instead of getting stuck or going negative, with zero special-casing. What makes this file tricky rather than just fiddly is a subtlety deliberately left unsolved: rotation pivots around the shape's *center*, and the center itself moves as width/height change during a resize — so a perfectly rigorous version would need to continuously re-derive the pivot mid-drag to keep the anchor corner glued to one exact scene position. This pivots around the *drag-start* center instead, which is exact when rotation is 0 and directionally correct otherwise, with a small documented drift for large resizes of rotated shapes.

**`selectTool.ts`'s resize extension** — `DragState` became a discriminated union (`{kind: "move"} | {kind: "resize"}`), and `onPointerDown` checks "did you grab a handle" *before* falling through to normal click/select logic, so handles take priority over reselecting the node underneath them.

**`canvas/tools/resizeCursor.ts`** — instead of assuming "n/s handles are always vertical," it looks at the *actual* screen positions of a handle and its opposite (which already account for rotation, since they came from `resizeHandles.ts`) and derives the angle from that. That's what makes the rotated rect's "e" handle still show a sensible cursor, snapped to the nearest of CSS's 4 resize-cursor axes.

## Bugs that came from the same root cause

Two separate bugs — drag distortion, then a stale resize outline — both traced back to one thing: `LineNode`/`ArrowNode` overload `x, y` to mean "start point," while every other node treats `x, y` as "top-left of a bounding box." That's a genuine crack in "uniform BaseNode fields": width/height/x/y mean something structurally different for these two types, and code that forgets that (drag only moving `x, y`; the outline assuming `(x, y)`–`(x+width, y+height)` always extends down-right) breaks in exactly the way it did. Worth remembering as a pattern: whenever a feature touches position generically, check whether the assumption holds for line/arrow too.

## Ranked, tersely

1. **`hitTest.ts`** — `isPointInPath`'s coordinate semantics are genuinely non-obvious; easy to get wrong on instinct, had to verify empirically.
2. **`resizeMath.ts`** — rotation-aware inverse transforms, plus a real unsolved edge case (pivot drift) that had to be consciously scoped rather than either ignored or fully solved.
3. **`selectionBounds.ts`'s `getWorldMatrix`** — not hard to write, but easy to get subtly wrong (transform composition order matters a lot), and it's load-bearing for three other files.
4. **The line/arrow bugs** — not hard to *fix* once found, but easy to miss entirely, since the bbox-uniformity assumption is implicit everywhere and only breaks on this one type pair.
