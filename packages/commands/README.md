# @open-canvas/commands

The portable graph-mutation core: pure functions and undoable `Command`s
that operate on a `SceneGraph` (from `@open-canvas/schema`) with no
dependency on React, the DOM's rendering surface, or any `apps/web`-specific
store.

## Known limitation: `DOMMatrix` / `DOMPoint`

`worldTransform.ts`, `sceneCorners.ts`, and `resolveInstance.ts`'s callers
compose node transforms using the browser's `DOMMatrix`/`DOMPoint` APIs.
These have no built-in Node.js equivalent, so this package currently only
*runs* in a DOM-having environment (a browser, or jsdom under a test
runner) — not in a plain Node process.

This is fine for now: `apps/web` is the only real consumer, and `apps/api`
only stores/validates `SceneGraph` JSON, it never calls `command.apply()`
itself. It becomes a real blocker the day something needs to apply commands
server-side (an AI proxy driving edits, a collab server replaying a command
log) — that will need a portable 2D-matrix implementation to replace
`DOMMatrix` first.

`replay.ts`'s `replaySceneEvents` (added alongside `events.ts`'s
serializable `SceneEvent`, for the per-page event log — see the root
README) hits this same limitation for any event built from a command that
reparents a node (group/ungroup/duplicate/create-component-instance all go
through `reparentNodeInGraph`, which calls `getWorldMatrix`) — it only runs
in a DOM-having environment today, same as everything else here. It's not
called server-side yet (no replay endpoint exists), so this is latent, not
a live bug.

## What deliberately stays in `apps/web`

Some code that touches these same node types is NOT here, because it's
either screen-space interaction or depends on a live, in-memory apps/web
store (not portable data):

- `resizeMath.ts` / `resizeHandles.ts` (drag-resize, handle hit-testing) —
  interactive, pointer-driven, not a graph mutation a `Command` performs.
- `canvas/tools/groupResize.ts`'s `getGroupBounds`/`getGroupHandles` —
  virtual (component-instance-child) aware, via the live `componentsStore`
  singleton. This package's own `sceneCorners.ts::getGroupBounds` is a
  separate, real-node-only version used by `GroupNodesCommand` and
  `componentMutations.ts`, since grouping/create-component always operate
  on real top-level `SceneGraph` members, never a virtual child.
