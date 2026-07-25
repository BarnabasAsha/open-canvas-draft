# Alignment tools walkthrough

Six buttons — align left/center/right, top/middle/bottom — that appear in the properties panel whenever 2+ nodes are selected, *or* whenever a single Frame/Section/Group is selected (aligning its own children to itself). The interesting part isn't the button row; it's that the whole feature needed almost no new machinery. Multi-select, scene-space bounds, and undoable move commands already existed from Group's work — alignment is mostly just a new way to combine them.

> **Updated since first shipped**: a single selected container now aligns its children to itself (see "Aligning a container's children to itself" below) — the "single node has nothing to align to" reasoning in the original pass turned out to be wrong; Figma treats a lone Frame/Group/Section as "align my children," not as a no-op. This section also documents a real undo bug that surfaced while adding it.

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

## Aligning a container's children to itself

The first version of this feature only triggered for a 2+ node selection — the reasoning was "a single node has nothing to align against." That's wrong for containers specifically: in Figma, selecting one Frame (or Group) and clicking "align left" snaps every child to *that frame's* left edge. `computeAlignedToContainer` covers exactly this, reusing the same `alignToBounds` the multi-select path already uses, just with a different idea of what the reference box is:

```ts
export function computeAlignedToContainer(containerId: NodeId, graph: SceneGraph, kind: AlignKind): Map<NodeId, SceneNode> {
  const container = graph.nodes[containerId];
  if (!container || !isContainer(container) || container.children.length === 0) return new Map();

  const bounds = getGroupBounds([containerId], graph.nodes);
  if (!bounds) return new Map();

  return alignToBounds(container.children, graph, kind, bounds);
}
```

Reusing `getGroupBounds` on a single-element array (`[containerId]`) is a small trick worth noticing: it's already "union of these nodes' scene bounds," and the union of *one* node is just that node's own bounds — no separate "get one node's bounds" helper needed. `isAlignableContainer` (exported alongside it) is the same `isContainer` check plus "has at least one child," used by `PropertiesPanel` to decide whether to show the Align section for a single selection at all.

`alignSelection` in `App.tsx` picks between the two based on selection size:

```ts
const patch =
  selectedIds.size === 1
    ? computeAlignedToContainer([...selectedIds][0], graph, kind)
    : selectedIds.size > 1
      ? computeAlignedNodes([...selectedIds], graph, kind)
      : new Map<NodeId, SceneNode>();
```

## No new Command — but a real undo bug surfaced getting here

The original version built a before/after pair straight from `computeAlignedNodes`'s return value and handed it to the existing `createMoveNodeCommand`, using only the ids that function said needed to move. That works fine when nothing else reacts to the move. It breaks the moment a Group is involved: aligning some of a group's children can change what the group's box auto-fits to (`reconcileGroupBounds` runs after every `sceneStore.update`), which then shifts the group's own position *and* any sibling children that didn't move directly — untracked by a command that only snapshotted the nodes `computeAligned*` explicitly touched. Undo would restore the nodes you meant to move while silently leaving the rest desynced.

Caught this by testing align-to-container on a group with three children of different widths (the seed data's "Nav Links" group) — after "align right" then undo, one child landed on the wrong x. The fix: apply the patch and reconcile *once*, ourselves, then diff the *whole graph* before vs. after to build the command, rather than trusting the patch's own key set:

```ts
const patchedNodes = { ...graph.nodes };
for (const [id, node] of patch) patchedNodes[id] = node;
const reconciled = reconcileGroupBounds({ ...graph, nodes: patchedNodes });

const before = new Map<NodeId, SceneNode>();
const after = new Map<NodeId, SceneNode>();
for (const id of Object.keys(reconciled.nodes)) {
  if (reconciled.nodes[id] !== graph.nodes[id]) {
    before.set(id, graph.nodes[id]);
    after.set(id, reconciled.nodes[id]);
  }
}
if (after.size === 0) return;

historyManager.execute(
  createMoveNodeCommand({ nodes: before, rootIds: graph.rootIds }, { nodes: after, rootIds: graph.rootIds }),
);
```

Object identity does the diffing work for free — `reconcileGroupBounds` (like every store update in this app) only creates new node objects for the ones it actually changes, so `reconciled.nodes[id] !== graph.nodes[id]` is true exactly for nodes touched by either the align patch or the reconcile pass it triggered, whatever the cascade depth. Scenes with no groups at all pay nothing extra: `reconcileGroupBounds` early-exits and returns the same object reference, so the diff loop finds precisely the original patch and nothing more. Still one `Command`, still `createMoveNodeCommand` — the fix is entirely in *what* gets captured, not a new undo mechanism.

## The UI: a proper section, not a bolted-on toolbar

The first version rendered `AlignmentToolbar` as a bare icon row with its own ad-hoc bottom border — it read as a floating widget rather than part of the panel's normal sectioned layout. It's now wrapped in the same `PanelSection` every other group of fields uses, titled "Align," and shown in two places: above the normal per-node sections when a single alignable container is selected, and in place of the old "N objects selected" placeholder for a 2+ selection:

```tsx
) : selectionCount === 1 && node ? (
  <>
    {isAlignableContainer(node) && (
      <PanelSection title="Align">
        <AlignmentToolbar onAlign={onAlign} />
      </PanelSection>
    )}
    <PropertySections node={node} onFocus={onFieldFocus} onChange={onFieldChange} onCommit={onFieldCommit} />
    ...
```

`AlignmentToolbar` itself stays fully presentational — six icon buttons (Phosphor's `AlignLeft`/`AlignCenterHorizontal`/`AlignRight`/`AlignTop`/`AlignCenterVertical`/`AlignBottom`), each just calling `onAlign(kind)`. No store reads, no logic — the same pattern every other panel component in this app already follows.

## Verified

Drew two rects at known positions/sizes, walked through all six operations in sequence via Playwright, and checked the resulting X/Y against hand-computed expected values for each step (each operation's output became the next operation's input, so this also exercises alignment being applied repeatedly to an already-modified selection) — all six matched exactly. Six sequential `Cmd+Z` presses landed the two rects back on their original drawn positions, confirming undo is correct through the whole chain.

For container alignment: selected a single Group (three text children spread horizontally) and a single Frame in turn, confirmed the Align section appears and the align operations apply correctly to their children with no console errors. Specifically reproduced and fixed the reconcile/undo bug above — "align right" on the three-child group, confirmed all three children's x (including the one that only moved as a reconcile side effect) both change correctly and fully restore on undo, then confirmed redo re-applies the exact same end state.

## What's deliberately out of scope for this pass

- **Distribute spacing** (even gaps between 3+ selected items) — a natural companion to align, but a distinct enough operation (needs sorting by position, not just a reference box) that it's its own follow-up rather than bundled in here.
- **Keyboard shortcuts** — buttons only for now, consistent with how most panel actions in this app work today.
