# Grouping walkthrough

Cmd+G bags up a multi-selection into a persisted `Group` node; Cmd+Shift+G dissolves one back into its members. The interesting part isn't the keyboard shortcut — it's that a Group is the first container in this app whose own box isn't something the user gets to set. A Frame or Section is drawn at whatever size you drag; a Group's size is *always* the exact union of whatever's inside it, forever, automatically. That one property is what makes almost everything else here different from Frame/Section.

## A container with one job and no fields of its own

`GroupNode` (`types/scene.ts`) is the smallest node type in the app:

```ts
export interface GroupNode extends BaseNode {
  type: "group";
  children: NodeId[];
}
```

No fill, no `clipsContent`, no corner radius — it inherits `BaseNode`'s x/y/width/height/rotation and nothing else. `ContainerNode` became `FrameNode | SectionNode | GroupNode`, which is the only change most of the existing container-aware code needed: `isContainer`/`getContainer` in `graphMutations.ts`, the children-recursion branch in `hitTest.ts`, the drop-target check in `containment.ts`, and the expand/collapse logic in `LayerItem.tsx` all narrow on `ContainerNode` or an explicit `"frame" || "section"` check that just grew a third arm. `drawGroup.ts` is a copy of `drawSection.ts`'s shape — no fill, just recurse into children — because a group, like a section, is purely organizational and has nothing of its own to paint.

The one place Group deliberately *doesn't* match Section: `SelectionOverlay.tsx` draws a floating name label above a selected Section (it represents a named page region, so the name matters on-canvas). A Group doesn't get that treatment — it's a bag, not a place — so selecting one just shows the ordinary selection outline.

## Keeping a group's box honest: `reconcileGroupBounds`

Since a Group's box is never something you set directly, something has to keep it in sync every time a child moves, resizes, gets deleted, or gets reparented in or out. Rather than teaching every one of those code paths about groups, `reconcileGroupBounds.ts` runs as a single pass *after* every graph mutation, wherever it came from:

```ts
export function reconcileGroupBounds(graph: SceneGraph): SceneGraph {
  const hasGroup = Object.values(graph.nodes).some((node) => node.type === "group");
  if (!hasGroup) return graph;

  let nodes = graph.nodes;
  for (const rootId of graph.rootIds) {
    nodes = reconcileSubtree(nodes, rootId);
  }
  return nodes === graph.nodes ? graph : { ...graph, nodes };
}
```

`reconcileSubtree` walks the scene tree post-order — every child's own subtree is fully settled before its parent group measures itself against it — so a group nested inside another group always sees its inner sibling's *final* box, not a stale one. `reconcileOneGroup` re-derives the group's `x/y/width/height` from `getGroupBounds(group.children, nodes)` (the same union-of-scene-space-corners helper the old ad-hoc multi-select resize already used), converts that back into the group's own parent-relative coordinates, and — because moving the group's origin would otherwise make its children visually jump — shifts every direct child's `x/y` by the exact opposite amount so nothing appears to move on screen. Only *direct* children need that compensation; a grandchild's coordinates are relative to its own immediate parent, which didn't move.

Getting this to actually run everywhere took one more step. `sceneStore.ts` originally exported `addNode`/`removeNode`/`reparentNode` as thin wrappers directly over the generic store's `update` — adding a *new* `sceneStore.update` that reconciles wouldn't have covered them, since they never called it. All three now route through one local `update`:

```ts
function update(updater: (graph: SceneGraph) => SceneGraph): void {
  store.update((graph) => reconcileGroupBounds(updater(graph)));
}
function reparentNode(nodeId: NodeId, newParentId: NodeId | null): void {
  update((graph) => reparentNodeInGraph(graph, nodeId, newParentId));
}
```

That matters concretely for live drag: `selectTool.ts`'s `reparentDraggedNodes` calls `sceneStore.reparentNode` on *every pointermove* as a dragged shape crosses a container boundary — if that had bypassed reconciliation, a group's outline would only catch up to a dragged-out child on the next unrelated mutation instead of the same frame.

## Resizing a group scales everything inside it — reusing code that already existed

A lone-selected Group's own resize handle doesn't just resize its own box (that would be pointless — a group has no fill or clip to visibly change). It scales every descendant proportionally, and it does this by reusing the exact machinery `groupResize.ts` already had for resizing an ad-hoc multi-selection together — `getGroupBounds`, `computeGroupScale`, `resizeNodeInGroup`. `selectTool.ts` just needed a way to feed that machinery a different "selection": `getGroupMemberBounds` swaps in the group's own subtree instead of whatever's actually selected —

```ts
function getGroupMemberBounds(soleId: NodeId, scene: SceneGraph): { bounds: Bounds; memberIds: NodeId[] } | null {
  const node = scene.nodes[soleId];
  if (!node || node.type !== "group" || node.children.length === 0) return null;

  const memberIds = collectWithDescendants(scene, [soleId]);
  const bounds = getGroupBounds(memberIds, scene.nodes);
  return bounds ? { bounds, memberIds } : null;
}
```

— checked ahead of the plain single-node resize path in `onPointerDown`, `updateHoverState`, and `getCursor` alike, so a lone group fully bypasses ordinary resize rather than merely gaining an alternative to it (letting the ordinary path run would resize the group's box while leaving its children untouched, and the very next `reconcileGroupBounds` pass would immediately snap it right back).

The one thing that couldn't just be reused as-is: an ad-hoc multi-selection essentially never contains both a container and its own child, but `{group, ...every descendant}` guarantees it every time. `resizeNodeInGroup`'s original formula placed a node by reading its *parent's* origin and scaling around the drag anchor — correct when the parent isn't also being resized this same gesture, wrong (off by exactly the parent's own origin shift) the instant it is, since the parent's origin printed at read time is already stale mid-gesture.

The fix turned out to need no bookkeeping at all, once worked out algebraically: if a node's parent is scaling around the *same* global anchor this same gesture, the anchor term cancels out entirely — `new local = old local × scale`, independent of the anchor's position and of what order members get processed in. `resizeNodeInGroup` now branches on exactly that:

```ts
export function resizeNodeInGroup(node, scale, graph, parentIsAlsoResizing) {
  return parentIsAlsoResizing ? scaleNodeLocally(node, scale) : scaleNodeByAnchor(node, scale, graph);
}
```

`scaleNodeByAnchor` is the original formula, used for anything whose parent *isn't* part of the resize (the ordinary multi-select case, and the group's own real graph-parent). `scaleNodeLocally` is pure multiplication — `node.x * scale.scaleX`, no origin lookup — used for every member whose parent is also in the member set. `applyGroupResize` in `selectTool.ts` decides which applies per member with one `memberIds.has(startNode.parentId)` check. No ordering dependency, no accumulator, no per-frame staleness — each member's new position depends only on its own starting values and one boolean.

## Group and Ungroup as commands

`createGroupNodesCommand`/`createUngroupNodesCommand` follow the same shape as every other command here — `{apply, invert}`, everything they need captured in a closure at construction — but grouping has a trap worth calling out explicitly. `addNodeToGraph` always drops a new node at root regardless of what `parentId` the literal claims, and `reparentNodeInGraph` no-ops if a node's `parentId` field *already* matches the target. So a `GroupNode` built with its real target parent pre-filled would silently fail to actually land there — the literal has to claim `parentId: null` and get reparented into place afterward, exactly like every shape tool already builds nodes at root before any drag-to-frame reparenting happens:

```ts
apply: (g) => {
  let next = addNodeToGraph(g, groupNode);              // always lands at root first
  if (parentId) next = reparentNodeInGraph(next, groupId, parentId);
  for (const id of memberIds) next = reparentNodeInGraph(next, id, groupId);
  return next;
},
```

`Ungroup`'s `invert` hits the identical trap in reverse — re-adding the captured group node has to force `parentId: null` *and* `children: []`, or the pre-filled children array would get every member appended a second time on top of what's already there.

Grouping a selection that spans different parents (one shape at root, one already inside a Frame) doesn't require moving anything through an intermediate stop — `findCommonAncestor` (`graphMutations.ts`, a variant of the existing `isAncestor` walk) finds the deepest shared ancestor, and every member gets reparented *directly* from wherever it currently lives straight into the new group, since `reparentNodeInGraph` already handles arbitrary source parents correctly on its own.

The one thing grouping explicitly refuses: bagging a container together with one of its own descendants. Lifting both into a shared ancestor would silently pull the child out of the parent it was *also* selected alongside, which is much more likely to be an accidental multi-select than an intentional restructure. `hasAncestorAmongMembers` checks every pair via `isAncestor` and the command returns `null` (not a harmless no-op `Command` sitting on the undo stack — genuinely nothing happens) if it finds one.

## The bug: lines and arrows stretching after grouping

Grouping a rotated rect, a line, and an arrow together visibly wrecked the line and arrow — both stretched way out toward the group's far corner, while the rect stayed correct. The rect was fine because it only has one point (`x`/`y`) that needs translating when it changes parent. Line and arrow have two — `x2`/`y2` — and `reparentNodeInGraph` (`graphMutations.ts`) was only ever shifting the first one:

```ts
// before
nodes[nodeId] = {
  ...node,
  parentId: newParentId,
  x: node.x + oldOrigin.x - newOrigin.x,
  y: node.y + oldOrigin.y - newOrigin.y,
};
```

A line's start point got correctly re-expressed in the new parent's coordinate space; its end point stayed exactly as it was — still a number meant to be read relative to the *old* parent's origin, now being read relative to a completely different one. The bigger the gap between the old and new origins, the more dramatic the stretch.

This bug was never really latent-free — it's just that nothing had triggered it before. `selectTool.ts`'s `translateNode` already handles a line/arrow's `x2`/`y2` correctly for ordinary drag-and-drop into a frame, and it *always* runs immediately after any reparent during a drag, fully recomputing the node's position from the original drag-start snapshot and overwriting whatever `reparentNodeInGraph` had just left behind — correct or not. `GroupNodesCommand` and `UngroupNodesCommand` are the first callers that reparent a node via `reparentNodeInGraph` with no such follow-up correction, so the gap that had always existed in the shared function finally had nothing left to paper over it.

Fixed at the source, benefiting every caller at once rather than working around it in the two new commands:

```ts
const shiftX = oldOrigin.x - newOrigin.x;
const shiftY = oldOrigin.y - newOrigin.y;

nodes[nodeId] =
  node.type === "line" || node.type === "arrow"
    ? { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY, x2: node.x2 + shiftX, y2: node.y2 + shiftY }
    : { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY };
```

Verified by reproducing the exact reported scenario — grouping a rotated rect with a line and an arrow from the seed scene — and confirming all three keep their original shape and relative position, with the group's bounding box tightly hugging all three afterward.

## What's deliberately out of scope

- **No context menu entry.** Cmd+G/Cmd+Shift+G only, matching how Delete has always been keyboard-only — there's no right-click menu system in the app yet.
- **No floating name label on canvas**, unlike Section — a group isn't a named place, so there's nothing worth labeling in the viewport itself.
- **Group rotation is unhandled.** Both the auto-fit compensation in `reconcileGroupBounds` and the resize-scaling math in `groupResize.ts` do translation-only math, which assumes the group itself has rotation 0 — the same assumption `reparentNodeInGraph` and `translateNode` already made for every other container. Nothing currently lets a container be rotated, so this hasn't bitten yet, but it's the same kind of gap the line/arrow bug was: correct until the first caller that actually exercises the untested edge.

## Ranked, tersely

1. **The line/arrow reparenting bug** — a real, pre-existing gap in shared code, invisible for as long as every caller happened to immediately overwrite its output. Grouping was simply the first caller that didn't.
2. **The resize-scaling algebra** — the plan going in was "thread an incrementally-updated accumulator in parent-first order," which would have worked but added real complexity. Working out that the anchor term cancels out entirely for a co-scaling parent turned it into one boolean check and zero ordering logic.
3. **The `parentId: null` / no-op-on-match trap** — easy to get subtly wrong in both directions (Group's `apply`, Ungroup's `invert`), since the failure mode isn't a crash, it's a graph that looks fine until you inspect whether a node's `parentId` field actually agrees with which container's `children` array contains it.
