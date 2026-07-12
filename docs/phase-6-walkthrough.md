# Phase 6 walkthrough

Shape tools — rectangle, ellipse, line, arrow, image — and the toolbar/properties panel the acceptance check turned out to require.

## The scope surprise, dealt with first

The brief only lists five tool files. But the acceptance check says: "each tool, **selected from the toolbar**... created node is immediately selected afterward (**so property panel shows it**)." Neither a toolbar nor a properties panel existed before this phase — there was no way to even reach the acceptance check without building minimal versions of both. So this phase is really three things: the tool logic itself, a real toolbar, and a read-only properties panel — the first genuine app-level UI in the project, as opposed to canvas-internal rendering.

That distinction matters for where the new code lives. `CLAUDE.md`'s presentational/container split has been sitting unused until now, because `Canvas.tsx`/`SelectionOverlay.tsx` are an explicit, intentional exception to it (they're the canvas engine's own view layer, not app UI). `Toolbar.tsx` and `PropertiesPanel.tsx` are genuine app UI, so they follow the rule properly for the first time: both are pure props-in/callbacks-out components, and `App.tsx` is the container — it reads `useActiveTool()`/`useSceneGraph()`/`useSelection()`, computes the sole selected node, and passes plain data down.

## `dragToCreateTool.ts` gets generalized, not just reused

Phase 5's version had `buildNode: (id, x, y, width, height) => SceneNode` — it always pre-computed a normalized bounding box before handing control to the tool. That's fine for frame/section/rect/ellipse, but line and arrow aren't bounding boxes — they're two literal endpoints, and `x2` can legitimately be less than `x` (a line drawn right-to-left). Forcing that through a "normalize into width/height" step doesn't make sense.

The signature changed to `buildNode: (id, start, current) => SceneNode` — the two raw drag points, full stop. Each tool now decides for itself how to turn two points into a node:

```ts
// rect/ellipse/frame/section — normalize into a proper bbox
buildNode: (id, start, current) => ({ ...rectFromPoints(start, current), ... })

// line/arrow — no normalization, the points ARE the endpoints
buildNode: (id, start, current) => ({ x: start.x, y: start.y, x2: current.x, y2: current.y, ... })
```

`onPointerMove` in the shared helper simplified as a result — instead of computing a rect and spreading it onto the existing node, it just calls `buildNode` again with the updated `current` point and replaces the draft outright. One code path, no bbox-specific logic left inside the generic helper at all.

### The bug this generalization surfaced: a straight line is not "too small"

The helper's discard rule for an accidental click was `width < MIN_DRAW_SIZE || height < MIN_DRAW_SIZE` — correct for a bbox shape (a rect with near-zero height is degenerate), but wrong for a line: **a perfectly horizontal line has a real height of exactly 0**, always, by definition, regardless of how long it is. That rule would discard every axis-aligned line and arrow, permanently.

Fixed by making the smallness check itself pluggable:

```ts
interface DragToCreateOptions {
  buildNode: (id: NodeId, start: Point, current: Point) => SceneNode;
  isTooSmall?: (node: SceneNode) => boolean; // defaults to the bbox rule
}
```

`lineTool`/`arrowTool` pass their own: distance between the two endpoints (`Math.hypot(x2 - x, y2 - y)`), which is the actually-meaningful measure of "did you drag far enough to mean it" for a shape defined by two points rather than an area.

## `imageTool.ts` — the one that doesn't use the shared helper

Every other tool commits synchronously at `pointerup`. Image can't: it needs a file first, and picking a file is asynchronous (the browser shows a native dialog and control comes back on the event loop's own schedule, not the tool's). So `imageTool.ts` is a separate, complete `Tool` implementation, though it reuses the pieces that still apply — `rectFromPoints`, `MIN_DRAW_SIZE` (both now exported from `dragToCreateTool.ts`).

The draft node still gets created live in `sceneStore` at `pointerdown`, same trick as everywhere else — an empty `src: ""` is enough for the box to render and track the drag with zero extra plumbing (the image drawer already handles an unloadable src by drawing nothing, so an empty placeholder box just sits there, no crash). What's different is `pointerup`:

```ts
function onPointerUp(): void {
  ...
  toolManager.setActiveTool("select"); // switch back to select right away
  if (tooSmall) { sceneStore.removeNode(id); return; }
  pickImageFile(id); // async — commit happens later, or not at all
}
```

`pickImageFile` opens a plain, never-attached `<input type="file" accept="image/*">` and calls `.click()` on it — browsers happily open the native picker for a detached input, no need to mount it in the DOM. Two outcomes:

- **A file is chosen** → `FileReader.readAsDataURL` embeds it as a data URI (no backend needed to "upload" anything — the image just lives in the node's `src` field), then the node commits through `AddNodeCommand` and gets selected, same as every other tool's success path.
- **The dialog is dismissed with nothing chosen** → the `change` event still fires, with an empty file list; the draft gets `sceneStore.removeNode`'d directly, no history entry, since it was never committed. (A `cancel` event listener also exists as a second path to the same cleanup — well-supported in Chromium, not chased further than that for older browsers.)

I chose file upload over the brief's other allowed option (a URL prompt) because actually getting your own images into a design tool is a real, common workflow, and `FileReader` makes it barely more code than a `window.prompt()` would have been.

### Why file upload was reachable in this phase, but not URL

Note this **wasn't** a coin flip — a URL prompt would have been synchronous (`window.prompt()` blocks until dismissed), while a file picker is asynchronous by nature. That's exactly why `imageTool.ts` couldn't reuse the shared helper's "commit inline at pointerup" shape: the helper's contract assumes the decision to commit-or-discard is knowable the instant the drag ends. Image had to move that decision out to wherever the async callback resolves, which is the concrete reason it's a hand-written `Tool` instead of a `createDragToCreateTool` call.

## `toolManager` had to become an actual store

Until now, `toolManager` was a bare module-level `let activeTool` — fine, because nothing ever needed to *observe* which tool was active; `Canvas.tsx` just asked it directly on every pointer event. A clickable toolbar changes that: it needs to render the currently-active tool as highlighted, and re-render when that changes (via a keyboard shortcut, or the auto-switch-back-to-select after drawing a shape) — which means something has to be subscribable.

`toolManager` moved onto the same `createStore<T>` pattern every other store in this app already uses, just storing a `ToolId` string (`"select" | "rectangle" | ...`) instead of the `Tool` object itself:

```ts
const tools: Record<ToolId, Tool> = { select: selectTool, rectangle: rectangleTool, ... };
const store = createStore<ToolId>("select");
export const toolManager = { ...store, setActiveTool, onPointerDown, onPointerMove, onPointerUp, getCursor };
```

Storing the *id* rather than the object is what let a `useActiveTool()` hook slot in identically to `useSceneGraph`/`useSelection`/`useViewport` (`useSyncExternalStore(toolManager.subscribe, toolManager.getState)`), and it's also what let `dragToCreateTool.ts` stop importing `selectTool` directly — it just calls `toolManager.setActiveTool("select")`, a plain string, decoupled from any concrete tool implementation.

## The circular import that (deliberately) stayed

`toolManager.ts` imports every tool file, including `frameTool.ts`/`rectangleTool.ts`/etc., which import `createDragToCreateTool` from `dragToCreateTool.ts` — which imports `toolManager` back, to call `setActiveTool("select")` after a shape commits. That's a genuine cycle. It works because the only place `dragToCreateTool.ts` touches `toolManager` is *inside a function body*, called long after every module has finished loading — never at module-evaluation time, which is the only case ES module cycles actually break. This is the same shape of cycle `drawNode.ts`/`drawFrame.ts` already relied on since Phase 1, so it wasn't a new risk, just a repeated one — confirmed clean by both `tsc` and an actual browser run rather than trusted on reasoning alone.

## What was tricky here, ranked

1. **Realizing the acceptance check implied real UI.** Nothing in the file list said "build a toolbar" — it took reading the acceptance check literally ("selected from the toolbar," "property panel shows it") to notice the phase couldn't be verified without it. Easy to skim past if you only read the file list.
2. **The line/arrow "too small" bug.** A straight, axis-aligned line having a real dimension of exactly 0 is obvious in hindsight, but it's the kind of thing that only shows up when you specifically try to draw a perfectly horizontal or vertical line — a diagonal test drag would never have caught it.
3. **Deciding image couldn't reuse the shared helper, precisely.** Not hard once you name it (async vs. sync commit), but worth being explicit about, since "these four are almost identical, this fifth one isn't" is exactly the kind of judgment call `createDragToCreateTool`'s generic contract could have quietly papered over in the wrong direction (e.g. by adding an awkward optional async hook to the shared helper just to fit image in) instead of just writing image as its own tool.
