# Phase 4 walkthrough

Undo/redo — how it hooks into the move/resize code from Phase 2 & 3 without touching their live-drag behavior.

## The core idea

Every mutation Phase 2/3 makes falls into two categories:

- **Live preview** — the dozens of `sceneStore.update()` calls that happen on every `pointermove` while you drag. These make the shape follow your cursor in real time.
- **The commit** — one moment, at `pointerup`, where "what actually happened during this whole gesture" gets recorded as a single undoable step.

Phase 4 only adds the second category. It doesn't change how dragging *feels* at all — it just also records "here's the before, here's the after" once the gesture ends. That's the difference between `Cmd+Z` undoing an entire drag versus undoing one pixel of it.

## `commands/Command.ts`

```ts
export interface Command {
  apply(graph: SceneGraph): SceneGraph;
  invert(graph: SceneGraph): SceneGraph;
}
```

A `Command` is a pure function pair, not an object that "remembers" the store. `apply` turns a graph into the after-state; `invert` turns it into the before-state. Neither one reaches into `sceneStore` itself — they're handed a graph and return a new one, same shape as every other pure function in this codebase (`resizeBBoxNode`, `translateNode`, etc.).

## `commands/MoveNodeCommand.ts` and `commands/ResizeNodeCommand.ts`

Both are **factory functions**, not classes — `createMoveNodeCommand(before, after)` returns a plain `{apply, invert}` object that closes over the two states. This mirrors `createStore.ts`'s pattern from Phase 2, which was chosen there specifically to avoid class/`this`-binding friction. Once that precedent existed, reintroducing a class here for `Command` would have been inconsistent for no benefit.

They're separate files because they operate on different domains, not just different names:

- `MoveNodeCommand` holds a `Map<NodeId, SceneNode>` for *before* and *after*, because a group drag can move several selected nodes at once, and undoing that should be one step, not one per node.
- `ResizeNodeCommand` holds a single `SceneNode` before/after pair, because resize only ever touches one node (Phase 3 scoped resize handles to single-selection only).

Both `apply`/`invert` just overwrite the relevant node(s) in a fresh `graph.nodes` copy — no diffing, no merging. The "old" and "new" values were already fully computed by the time a command exists; the command's only job is to know which one to install.

## `store/historyManager.ts`

```ts
function execute(command: Command): void {
  sceneStore.update((graph) => command.apply(graph));
  undoStack.push(command);
  redoStack = [];
}
```

Three functions, two arrays, no pub/sub. That last part is a deliberate choice: nothing in the UI currently needs to *react* to the undo stack changing (there's no "disable the undo button when empty" affordance yet), so this follows the same "plain state + functions, no store wrapper" pattern `toolManager` already established in Phase 2 — building on `createStore` here would have been solving a problem that doesn't exist yet.

The three functions:

- **`execute`** — apply the command, push it to `undoStack`, and **clear `redoStack`**. That clear is what makes "undo, then do something new" correctly throw away the old redo history instead of leaving a confusing branch.
- **`undo`** — pop from `undoStack`, call `invert()`, push the same command onto `redoStack`.
- **`redo`** — pop from `redoStack`, call `apply()` again, push back onto `undoStack`.

Because `undo`/`redo` just move the *same command object* between the two stacks (never rebuild it), a command has to be capable of being applied and inverted arbitrarily many times — which is automatically true here, since `apply`/`invert` are pure functions of whatever graph they're given, not one-shot operations.

## The retrofit in `selectTool.ts`

This is the part that actually plugs Phase 2/3 into history. `onPointerMove` is **untouched** — it still calls `sceneStore.update()` directly on every frame, exactly as before, for live feedback with no history involved.

The new logic lives entirely in `onPointerUp`:

```ts
function onPointerUp(): void {
  if (dragState) commitDrag(dragState);
  dragState = null;
}
```

`commitDrag` reads whatever `sceneStore` currently holds (which live-drag already wrote) and compares it against the snapshot captured back at `pointerdown`:

```ts
function commitMove(drag: MoveDrag): void {
  const { nodes } = sceneStore.getState();
  const after = new Map<NodeId, SceneNode>();
  let changed = false;

  for (const [id, before] of drag.snapshots) {
    const current = nodes[id];
    if (!current) continue;
    after.set(id, current);
    if (current !== before) changed = true;
  }

  if (changed) historyManager.execute(createMoveNodeCommand(drag.snapshots, after));
}
```

Notice `historyManager.execute` here re-applies values that are *already* on screen (since `pointermove` wrote them). That's intentionally redundant — `execute`'s contract is "always call `apply()`," and keeping that contract uniform (rather than special-casing "well actually this one's already applied") means every caller of `execute` behaves identically, which is worth a harmless extra write.

**The no-op guard** (`if (changed)`) is the one piece of behavior *not* explicitly asked for in the brief, added because without it, clicking a shape without moving it would still push a full undo step that does nothing when you hit `Cmd+Z`. It works by reference equality: if `pointermove` never fired during a gesture (a plain click), `current` is still the *exact same object* as `before` — nothing ever wrote a new one — so the check is free and correct for the common case. It's not perfect: if you drag a shape away and wiggle it back to its exact starting pixel before releasing, `pointermove` *did* fire, so `current` is a new (but value-identical) object, and the guard doesn't catch that — you'd get one harmless no-op undo step. Fixing that fully would need a value-equality check instead of a reference check, which felt like more complexity than the acceptance check called for.

`commitResize` does the same thing for the single resized node, comparing against `drag.startNode` captured when the handle was first grabbed.

## `canvas/useKeyboardShortcuts.ts`

A small hook, `useEffect`-based, attaching one `window` keydown listener:

```ts
const isUndoRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z";
if (!isUndoRedo) return;

e.preventDefault();
if (e.shiftKey) historyManager.redo();
else historyManager.undo();
```

This `useEffect` is fine under the project's "no `useEffect` for canvas drawing" rule — that rule is about not letting React's render cycle drive *canvas repaints*; a global event listener's setup/teardown is a normal side-effect-at-the-edge, the same category as `Canvas.tsx`'s existing store-subscription effect. It's named generically (`useKeyboardShortcuts`, not `useUndoRedo`) because undo/redo will obviously not be the last shortcut this app needs — delete, duplicate, nudge-with-arrow-keys are all likely later additions to the same listener.

It's called once, in `App.tsx`, since keyboard shortcuts are an app-wide concern rather than something owned by the canvas surface specifically.

## What was actually tricky here

Less than Phase 2/3, honestly — the *design* (snapshot at start, diff at commit) was already in place from the move/resize work, so history mostly slotted in without new geometry problems. The two things worth calling out:

1. **Deciding where the redundant `apply()` call was acceptable.** It would have been easy to "optimize" `execute` to skip re-applying state that's already current, but that breaks the invariant that `execute` always does what it says, and makes `undo`/`redo` (which *do* need to actually change the graph) inconsistent with `execute`. Leaving in the harmless redundant write kept all three functions behaving identically.
2. **The no-op guard's reference-equality trick.** It's a small piece of code, but the reasoning behind *why* it correctly detects "nothing happened" (no `pointermove` fired → no new object was ever created → same reference survives to `pointerup`) is the kind of thing that looks obvious in hindsight but isn't obvious to reach for the first time — it only works because every mutation in this codebase creates new objects via spread rather than mutating in place.
