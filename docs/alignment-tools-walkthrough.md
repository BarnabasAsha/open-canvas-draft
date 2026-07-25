# Alignment tools walkthrough

Six buttons — align left/center/right, top/middle/bottom — that appear in the properties panel whenever 2+ nodes are selected. The interesting part isn't the button row; it's that the whole feature needed almost no new machinery. Multi-select, scene-space bounds, and undoable move commands already existed from Group's work — alignment is mostly just a new way to combine them.

## The geometry: one function, reusing what Group already built

`src/canvas/tools/alignment.ts` is the entire pure-logic layer:

```ts
export function computeAlignedNodes(nodeIds: readonly NodeId[], graph: SceneGraph, kind: AlignKind): Map<NodeId, SceneNode> {
  const bounds = getGroupBounds(nodeIds, graph.nodes);
  ...
}
```

`getGroupBounds` is the exact same helper `groupResize.ts` already uses to compute the union bounding box for a multi-select resize — it doesn't care why you want the union of some nodes' scene-space bounds, and alignment needed precisely that: a reference box to align everything else against. For each selected node, its own scene-space bounds come from `getSceneCorners` (the same helper `SelectionOverlay` and hit-testing already use), and the six `AlignKind` cases just pick which edge or center to match:

```ts
case "left": dx = bounds.minX - nodeMinX; break;
case "centerH": dx = boundsCenterX - (nodeMinX + nodeMaxX) / 2; break;
...
```

One deliberate scope decision here: the reference box is the union of the *selection's* bounds, not each node's parent. Two nodes living in different frames can still be aligned to each other directly — there's no "must share a parent" restriction, because `getGroupBounds`/`getSceneCorners` were already parent-agnostic (they resolve through each node's own world matrix regardless of ancestry). Restricting to same-parent would have been *extra* code to add, not a simplification, and would silently no-op the very case someone playing with cross-frame layouts would try first.

## Why a scene-space delta can just be added to local x/y

The only new-ish reasoning in this feature: once `dx`/`dy` is known, applying it means writing `node.x + dx`, directly — no parent-origin lookup, no coordinate-space conversion, unlike `reparentNodeInGraph`'s translation math. That's safe specifically *because* nothing is changing parents here. A node's local x/y and its scene position differ only by its ancestors' cumulative translation (rotation aside, which the rest of the app already treats as a known simplification for containers) — shifting a node without reparenting it moves both by the identical vector, so the scene-space delta *is* the local delta. `reparentNodeInGraph` needs the origin dance because it's converting between two different parents' coordinate spaces; alignment never does that, so it doesn't need to.

## No new Command — this is just a move

`alignSelection` (in `App.tsx`, alongside the app's other small store-orchestration functions like `toggleVisible`/`renameLayer`) builds a before/after pair and hands it straight to the existing `createMoveNodeCommand`:

```ts
function alignSelection(kind: AlignKind): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size < 2) return;

  const graph = sceneStore.getState();
  const updated = computeAlignedNodes([...selectedIds], graph, kind);
  if (updated.size === 0) return;

  const before = new Map<NodeId, SceneNode>();
  for (const id of updated.keys()) {
    const node = graph.nodes[id];
    if (node) before.set(id, node);
  }

  historyManager.execute(
    createMoveNodeCommand({ nodes: before, rootIds: graph.rootIds }, { nodes: updated, rootIds: graph.rootIds }),
  );
}
```

No new `Command` type, no bespoke undo logic — a click on an align button *is* a move, from history's point of view, exactly the same shape `MoveNodeCommand` was already built to swap. `rootIds` never changes (alignment never reparents anything), so both sides of the snapshot reuse the same array. Locked nodes and no-op shifts (a node already sitting on the target line) are filtered out in `computeAlignedNodes` itself, so clicking "align left" when one of two selected nodes is already leftmost only touches the one node that actually needs to move — and if every selected node is locked, `updated.size === 0` and nothing gets pushed onto the undo stack at all.

One side effect that comes for free: if an aligned node lives inside a Group, the group's box re-fits automatically afterward — `reconcileGroupBounds` runs after every `sceneStore.update` regardless of what triggered it, so alignment didn't need to know groups exist.

## The UI: presentational, and it lives where multi-select already had a placeholder

`PropertiesPanel.tsx` used to render a plain "N objects selected" line whenever 2+ nodes were selected — real per-node editing across a heterogeneous multi-selection is a deliberately separate, harder problem, but alignment applies to *any* multi-selection regardless of node type, so it's the one multi-select action that fits naturally in that empty space:

```tsx
) : selectionCount > 1 || !node ? (
  <>
    <AlignmentToolbar onAlign={onAlign} />
    <div style={{ padding: "4px 0", color: "var(--text-muted)" }}>{selectionCount} objects selected</div>
  </>
) : (
```

`AlignmentToolbar` itself is fully presentational — six icon buttons (Phosphor's `AlignLeft`/`AlignCenterHorizontal`/`AlignRight`/`AlignTop`/`AlignCenterVertical`/`AlignBottom`, the same non-"Simple" style already used everywhere else in the toolbar), each just calling `onAlign(kind)`. No store reads, no logic — the same pattern every other panel component in this app already follows.

## Verified

Drew two rects at known positions/sizes, walked through all six operations in sequence via Playwright, and checked the resulting X/Y against hand-computed expected values for each step (each operation's output became the next operation's input, so this also exercises alignment being applied repeatedly to an already-modified selection) — all six matched exactly. Six sequential `Cmd+Z` presses landed the two rects back on their original drawn positions, confirming undo is correct through the whole chain. No console errors.

## What's deliberately out of scope for this pass

- **Distribute spacing** (even gaps between 3+ selected items) — a natural companion to align, but a distinct enough operation (needs sorting by position, not just a reference box) that it's its own follow-up rather than bundled in here.
- **Align a single selected node to its parent** — Figma does this when only one node is selected; this pass only activates once 2+ nodes are selected, matching what was actually asked for.
- **Keyboard shortcuts** — buttons only for now, consistent with how most panel actions in this app work today.
