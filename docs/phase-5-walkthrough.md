# Phase 5 walkthrough

Frame and section tools — drawing containers, and the containment logic that reparents nodes moved in and out of them.

## The goal, restated precisely

Two things, and they're more separable than they look:

1. **Draw a frame/section** by dragging on empty canvas.
2. **Containment**: as a node is dragged, once its bounding box fully sits inside a frame/section it becomes that frame's child; dragged back out, it becomes a root node again. (Originally this was "resolved once the drag ends" — see the bug writeup below for why that changed.)

The interesting part of this phase isn't the drawing — it's that (2) touches almost every layer of the app at once: geometry (is this bbox inside that one?), the store (what does "reparent" actually mean for `parentId`/`children`/`rootIds`), a subtle coordinate-space bug, and undo (a reparent has to be one atomic step, not two).

## A layering fix first: `utils/worldTransform.ts`

`getWorldMatrix` (composes a node's full local-to-scene transform by walking its `parentId` chain) used to live in `canvas/selectionBounds.ts`. This phase needed it from `store/graphMutations.ts` too — and `store/` depending on `canvas/` would point the dependency arrow backwards (canvas-layer code is supposed to depend on the store, never the reverse). So it moved to `utils/`, a layer below both, and `selectionBounds.ts`/`resizeHandles.ts`/`resizeMath.ts` now import it from there instead of defining or re-exporting it themselves. Small mechanical change, but worth noting as the kind of thing a new requirement can expose: the old location was fine until something in a *lower* layer needed the same math.

## `store/graphMutations.ts` — the actual editing primitives

Three pure functions, each taking a `SceneGraph` and returning a new one:

- **`addNodeToGraph`** — inserts into `nodes`, appends to `rootIds`. (New nodes are always created at the root; a freshly drawn frame doesn't have a parent yet.)
- **`removeNodeFromGraph`** — deletes from `nodes`, and removes the id from wherever it was referenced (a container's `children`, or `rootIds`).
- **`reparentNodeInGraph`** — the one with real logic in it (below).

These are pure and side-effect-free on purpose, for the same reason every other geometry/graph function in this codebase is: `sceneStore`'s new `addNode`/`removeNode`/`reparentNode` methods are thin wrappers that call these inside `store.update(...)`, and `AddNodeCommand`'s `apply`/`invert` call the *exact same functions* directly. One definition of "what does adding a node mean," used by both the live/direct path and the undo/redo path — no risk of the two drifting apart.

### `reparentNodeInGraph`'s guards

Before touching anything, it refuses to reparent when:

- `newParentId === nodeId` (a node can't be its own parent)
- `newParentId` is a descendant of `nodeId` (would create a cycle — walks up from `newParentId` via `parentId` checking for `nodeId`)
- `newParentId` isn't null and isn't an existing frame/section (you can't reparent into a rect)

This is what "centralize reparenting logic in the store" bought us concretely: the move tool never has to know these rules exist. It just calls `sceneStore.reparentNode(id, targetId)` and trusts that an invalid request quietly does nothing, rather than corrupting the tree.

### The bug this would have shipped with: the position jump

`x`/`y` on every node is defined *relative to its parent*. A root-level node's `x, y` are effectively scene coordinates (no parent to be relative to); a node inside a frame at `(40, 180)` has `x, y` relative to that frame's corner. Reparenting only touches `parentId`, `children`, and `rootIds` — if that's *all* it did, the moment a node crossed into a frame, its `x, y` values would suddenly be reinterpreted in the new parent's coordinate space without changing, and it would visually teleport by however far apart the two parents' origins are.

The fix: `reparentNodeInGraph` also computes each parent's origin in scene space (`getParentOrigin`, via `getWorldMatrix`) and adjusts `x, y` by the difference, so the node's on-screen position is unchanged at the instant of reparenting:

```ts
const oldOrigin = getParentOrigin(graph, node.parentId);
const newOrigin = getParentOrigin(graph, newParentId);
nodes[nodeId] = {
  ...node,
  parentId: newParentId,
  x: node.x + oldOrigin.x - newOrigin.x,
  y: node.y + oldOrigin.y - newOrigin.y,
};
```

This is translation-only — it assumes neither the old nor the new parent is rotated. That's not a hand-wave: it's exactly true for every container this app can currently create, since `frameTool`/`sectionTool` always draw at `rotation: 0` and there's no UI yet to rotate a frame afterward. If a rotated-frame feature shows up later, this is the function that needs revisiting.

## `MoveNodeCommand` had to grow up

Phase 4's version only knew how to swap individual node values — `Map<NodeId, SceneNode>` before/after. That's not enough once a move can *also* reparent, because reparenting can add or remove an id from `graph.rootIds`, and `rootIds` lives on the graph itself, not on any single node. If undo only restored node values, a reverted reparent would put `parentId` back to `null` on the node but never put its id back into `rootIds` — the node would be structurally an orphan, invisible to every traversal (`drawScene`, `hitTestScene`, everything walks from `rootIds` down).

So the command's before/after became a `MoveSnapshot`:

```ts
export interface MoveSnapshot {
  nodes: ReadonlyMap<NodeId, SceneNode>;
  rootIds: readonly NodeId[];
}
```

and `commitMove` in `selectTool.ts` now captures `rootIds` at drag start, and re-reads it after any reparenting, alongside the node values. Verified this explicitly: dragged a rect into a frame, `Cmd+Z` once, then moved the frame again — the rect didn't follow, proving `rootIds` (not just the node's own `parentId`) came back correctly, not just a visually-similar-looking state.

## `canvas/tools/containment.ts`

`findContainerAt(nodeId, scene)` answers "what's the topmost container whose bounds fully enclose this node's bounds?" It deliberately mirrors `hitTest.ts`'s traversal shape — children checked before a container's own body, siblings walked in reverse so the last-drawn (topmost) one wins — on the theory that "what would this land inside if I dropped it here" and "what would a click here select" should agree with each other. It reuses `getSceneCorners` (from `selectionBounds.ts`) rather than reimplementing corner math, which is also why it gets line/arrow's real endpoint-based bounding box for free instead of the generic `(0,0)-(width,height)` model that doesn't apply to them.

## Wiring it into `selectTool.ts` — and the bug this section used to describe

The first version of this checked containment **once, at `commitMove`** (pointerup) — deliberately, on the theory that Phase 4 already established "commit gestures, not pixels": reparenting is a structural change, so it seemed right to only resolve it once the drag actually ended, exactly like the undo command itself only gets built once.

That turned out to be wrong, and it shipped a real bug: **a node dragged out of a clipping frame went invisible for the whole drag, and only reappeared on drop.** Root cause: the renderer clips based on tree structure, not screen position. `drawFrame` only recurses into whatever's actually listed in its own `children` array — it has no idea a child has been dragged somewhere else visually. Since reparenting (the thing that would remove the id from that array) was deferred to commit, a node dragged outside its frame was, structurally, *still that frame's child* for the entire drag — so the frame's `clipsContent: true` correctly, by the letter of the code, clipped it away. It only became visible again the instant `commitMove` finally ran the reparent.

The fix moves containment resolution from "once, at commit" to "live, every `pointermove`" — the same event that already does the position update:

```ts
function applyMove(drag: MoveDrag, scenePoint: Point): void {
  const dx = scenePoint.x - drag.startPoint.x;
  const dy = scenePoint.y - drag.startPoint.y;

  sceneStore.update((scene) => {
    const nodes = { ...scene.nodes };
    for (const [id, start] of drag.snapshots) {
      const current = nodes[id];
      if (!current) continue;
      nodes[id] = translateNode(scene, start, current, dx, dy);
    }
    return { ...scene, nodes };
  });

  reparentDraggedNodes(drag); // NEW — was only called once, from commitMove
}
```

`reparentDraggedNodes` is exactly the loop the old `commitMove` used to run — `findContainerAt` per moved node, `sceneStore.reparentNode` if it changed — just moved earlier and run on every frame of the drag instead of once at the end. `commitMove` is now much thinner: containment is already resolved by the time it runs, so its only job is gathering everything that changed across the *whole* gesture (moved nodes, plus every container whose `children` changed at any point — a node can pass through more than one frame before the drag ends) into a single undo command:

```ts
const affectedBefore = new Map<NodeId, SceneNode>(drag.snapshots);
for (const [id, node] of drag.touchedContainers) {
  if (!affectedBefore.has(id)) affectedBefore.set(id, node);
}
```

`drag.touchedContainers` replaces the old `captureIfMissing` calls that used to live inline in `commitMove` — it's now a `Map` on the drag state itself, populated by `reparentDraggedNodes` as it runs across potentially many `pointermove` events, still guarded the same way (skip if already captured, so re-entering the same frame twice in one gesture doesn't overwrite its true pre-gesture state with an already-mutated one).

### The part that made this more than a one-line fix: position math across a live reparent

Moving the reparent check earlier surfaced a second problem. Position is computed as "drag-start value + total delta since drag start" — fine, as established in Phase 2, as long as the coordinate frame that value is expressed in never changes mid-drag. But it now *can* change mid-drag: the moment `reparentDraggedNodes` reparents a node, its `x`/`y` become relative to a different parent (with a different origin), and if the very next `pointermove` still computes `start.x + dx` against the *original* parent's frame, the node visibly jumps back to the wrong place — undoing the position fix `reparentNodeInGraph` had just applied.

`translateNode` now recovers the node's *absolute scene position* at drag start (`start`'s local position plus its start-time parent's origin), adds the total delta, and re-expresses that in whichever parent the node is in **right now** — not whichever parent it started in:

```ts
function translateNode(scene: SceneGraph, start: SceneNode, current: SceneNode, dx: number, dy: number): SceneNode {
  const startOrigin = getParentOrigin(scene, start.parentId);
  const currentOrigin = getParentOrigin(scene, current.parentId);
  const shiftX = startOrigin.x - currentOrigin.x + dx;
  const shiftY = startOrigin.y - currentOrigin.y + dy;
  return { ...current, x: start.x + shiftX, y: start.y + shiftY };
}
```

When the parent hasn't changed, `startOrigin` and `currentOrigin` are identical and this collapses back to the original "start + delta" behavior — the fix is additive, not a special case bolted on top.

One more wrinkle: `onPointerUp` now also runs `applyMove` one final time before committing, since a `pointerup` isn't guaranteed to land on the exact pixel the last `pointermove` fired for. That extra call is guarded by `didMove` (pointerup's position differs from pointerdown's) — without the guard, a plain click would call `applyMove` once, which always produces a *new* node object even when the numbers are identical, which would trip the reference-equality "did anything change" check and record a no-op undo step for a click that never moved anything.

## `dragToCreateTool.ts` — creating in real time instead of previewing separately

The obvious way to build "drag to draw a rect" is to track a local draft rectangle during the drag and only touch the store once, at the end. This does something different: it calls `sceneStore.addNode` **immediately at pointerdown**, with a zero-size node, live-outside of history — then every `pointermove` just updates that node's `width`/`height` via the normal `sceneStore.update()` path, exactly like a resize drag does.

The payoff: because the draft is a real node in the real store the whole time, the existing renderer, hit-testing, and everything else "just work" on it with zero extra plumbing — nothing had to be taught about a separate "draft" concept. At `pointerup`, if the result is big enough (`MIN_DRAW_SIZE`, guards against an accidental click), its *current* state gets wrapped in one `AddNodeCommand` and committed through `historyManager` — same "redundant but harmless re-apply" pattern Phase 4 established for move/resize. Too small, and `sceneStore.removeNode` discards it directly, no history entry, since it was never committed in the first place.

`frameTool.ts`/`sectionTool.ts` are then just this factory called with a `buildNode` function each — the only difference between them is what fields a fresh frame vs. section starts with.

## The one thing added that wasn't asked for: keyboard shortcuts

There's no toolbar UI yet, so without *some* way to activate `frameTool`/`sectionTool`, none of this is reachable. Extended `useKeyboardShortcuts.ts` with `V` (select), `F` (frame), `Shift+S` (section) — matching Figma's own mnemonics rather than inventing new ones. After a shape is drawn, the tool auto-switches back to select, matching the "draw one shape, land back in the pointer tool" behavior most design tools default to.

## What was tricky here, ranked

1. **Deferred containment making a dragged node invisible for the whole gesture.** This is the trickiest thing in the phase, and it shipped in the first version — the containment/undo design was internally consistent and passed every test I ran *except* actually watching a real drag happen. It only surfaces as a visual glitch, at exactly the moment a node crosses a clipping frame's boundary, and the underlying cause (rendering walks `children` arrays, not screen position — so "structurally still a child" and "visually outside the frame" can disagree for the length of a whole drag) isn't something the type system or a unit-style check would catch. Reproducing it with instrumented, fine-grained screenshots was what actually pinned it down, not code review.
2. **Position math surviving a live reparent.** Once containment moved from "once, at commit" to "live, every pointermove," the existing "start value + total delta" position formula quietly broke, because it implicitly assumed the coordinate frame (the parent) never changes mid-gesture. The fix (recover absolute scene position, then re-express in whatever parent is current) is only a few lines, but the reasoning for *why* the original formula was suddenly wrong — a frame that used to be constant for the whole gesture no longer is — is easy to miss if you're focused on "did the reparent work" rather than "does position math have a hidden assumption about time."
3. **The coordinate jump on reparent** (the original, structural version of the same class of bug). Not hard to fix once spotted, but easy to miss entirely — invisible in the type system, only shows up as "huh, why did it teleport" the first time something crosses into a non-origin-positioned frame.
4. **`MoveNodeCommand` needing `rootIds`.** The reasoning chain (reparent can touch `rootIds` → `rootIds` lives on the graph, not a node → the old node-only snapshot silently can't restore it → undo would produce a structurally broken tree) has several links, and skipping any one of them means undo *looks* fine until you specifically test "move the frame after undoing" rather than just "does the rect look back in place."
5. **Getting the "before" snapshot right when multiple nodes reparent into the same container in one gesture.** The guard that's now on `drag.touchedContainers` is a small piece of code, but the reason it has to check "have I already captured this container" (rather than just always capturing) is non-obvious until you trace through what a second node's reparent would otherwise overwrite.
