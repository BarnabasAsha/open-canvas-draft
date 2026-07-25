# Shared property editing walkthrough

Selecting 2+ nodes of the same type — or a single Frame/Section/Group whose children are all the same type — now shows their shared *style* fields (Fill, Stroke, Corner radius, Typography) in the properties panel, editable in one go. Change the font on two selected Text nodes, or set a shared color for every link inside a "Nav Links" group, and it lands as one undo step covering all of them.

Before this, a multi-selection collapsed to a bare "N objects selected" line — real per-node editing across an arbitrary multi-selection is a genuinely hard problem (which fields are even shared when types differ?), so it was left alone rather than half-solved. This feature deliberately doesn't attempt that hard version; it solves the common, well-defined case instead.

## Scoping: same-type only, and never Position

Two boundaries worth calling out, because both were deliberate rather than accidental gaps:

**Same type only.** `uniformNode` (in `App.tsx`) is only set when every selected node shares one `type` — otherwise there's no single answer to "does this selection have a Fill field," so it falls back to the plain count, same as before:

```ts
const directUniformNode =
  directSelectedNodes.length > 1 && directSelectedNodes.every((n) => n.type === directSelectedNodes[0].type)
    ? directSelectedNodes[0]
    : null;
```

**Never Position.** `SharedPropertySections` (in `PropertiesPanel.tsx`) is the same section list as the single-node `PropertySections`, minus Position and the name header:

```ts
function SharedPropertySections({ node, onFocus, onChange, onCommit }: PropertySectionsProps) {
  const fillNode = asFillNode(node);
  const strokeNode = asStrokeNode(node);
  const cornerRadiusNode = asCornerRadiusNode(node);

  return (
    <>
      <AppearanceSection node={node} fillNode={fillNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      {strokeNode && <StrokeSection node={strokeNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {cornerRadiusNode && <CornerRadiusSection node={cornerRadiusNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {node.type === "text" && <TypographySection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
    </>
  );
}
```

Batch-setting X/Y for two nodes would just stack them on the same point — that's never what "set the same font for both" means, and Align already owns "where these nodes sit relative to each other." Style fields (color, font, corner radius) don't have that problem: setting them to the same value on every selected node is exactly the point.

One further simplification: the fields shown are `uniformNode`'s own current values (the first selected node), not a true "mixed" indicator when the selection actually disagrees (e.g. two texts at different font sizes both just show the first one's size until you touch the field). Building real mixed-value detection and display across every field type (NumberField showing blank, Select showing no highlighted option, a "multiple colors" swatch) is a legitimate follow-up, not attempted here.

## The write path: useMultiNodeEdit, mirroring useNodeEdit exactly

`useNodeEdit` already had the right shape for single-node editing: capture a snapshot on focus, write live to the store on every change (instant canvas feedback), and push one `Command` on commit — the same "one undo step per edit session, not per keystroke" pattern `NumberField`'s live-drag already relies on. `useMultiNodeEdit` is the same three functions, just closing over a list of ids instead of one:

```ts
export function useMultiNodeEdit(nodeIds: readonly NodeId[]): NodeEditHandlers {
  const beforeRef = useRef<Map<NodeId, SceneNode> | null>(null);

  function snapshot(): Map<NodeId, SceneNode> {
    const { nodes } = sceneStore.getState();
    const snap = new Map<NodeId, SceneNode>();
    for (const id of nodeIds) {
      const node = nodes[id];
      if (node) snap.set(id, node);
    }
    return snap;
  }

  function onFieldChange(patch: Record<string, unknown>): void {
    sceneStore.update((graph) => {
      let next = graph.nodes;
      for (const id of nodeIds) {
        const node = next[id];
        if (!node) continue;
        next = { ...next, [id]: { ...node, ...patch } as SceneNode };
      }
      return next === graph.nodes ? graph : { ...graph, nodes: next };
    });
  }
  // onFieldFocus/onFieldCommit follow the same shape as useNodeEdit, just over the whole snapshot Map.
}
```

It returns the exact same `NodeEditHandlers` interface `useNodeEdit` does, so `PropertySections`/`SharedPropertySections` and every individual field component don't need to know or care whether they're wired to one node or many — the fan-out is entirely inside the hook.

`SetNodesCommand` is `SetNodeCommand`'s plural sibling for the same reason — apply/invert over a `Map<NodeId, SceneNode>` instead of a single id:

```ts
export function createSetNodesCommand(before: Map<NodeId, SceneNode>, after: Map<NodeId, SceneNode>): Command {
  return {
    apply: (graph) => setNodes(graph, after),
    invert: (graph) => setNodes(graph, before),
  };
}
```

## Hooks can't be conditional, so both are always instantiated

`App.tsx` needs `useNodeEdit` for a single selected node's own fields and `useMultiNodeEdit` for whatever's being batch-edited — but which one actually applies depends on the current selection, and React doesn't allow calling a hook conditionally. Both are called unconditionally every render; each one is simply a no-op when handed an empty id (single) or id list (multi):

```ts
const singleNodeEdit = useNodeEdit(soleSelectedNode?.id ?? "");
const multiNodeEdit = useMultiNodeEdit(uniformNode ? uniformNodeIds : []);
```

`PropertiesPanel` receives *both* sets of handlers as separate props (`onFieldFocus/Change/Commit` for `node`, `onSharedFieldFocus/Change/Commit` for `uniformNode`) rather than one shared set — the two can be showing on screen at the same time (see below), each editing a different set of node ids, so they can't be collapsed into one.

## One level down: a container's own children

The natural extension, once the container-alignment work (see the alignment walkthrough) established "a single selected container can stand in for its children": if a Frame/Section/Group's children are all one type, show their shared fields too, right below the container's own Position/Appearance:

```ts
const containerChildIds = soleSelectedNode && isAlignableContainer(soleSelectedNode) ? soleSelectedNode.children : [];
const containerChildNodes = containerChildIds.map((id) => scene.nodes[id]).filter((n): n is SceneNode => n !== undefined);
const containerUniformNode =
  containerChildNodes.length > 0 && containerChildNodes.every((n) => n.type === containerChildNodes[0].type)
    ? containerChildNodes[0]
    : null;

const uniformNode = directUniformNode ?? containerUniformNode;
const uniformNodeIds = directUniformNode ? selectedIdList : containerChildIds;
```

`directUniformNode` and `containerUniformNode` are mutually exclusive in practice (the first only applies to a 2+ direct selection, the second only to exactly one container selected), so folding them into one `uniformNode` via `??` is safe — whichever applies, `uniformNodeIds` picks the matching id list to actually write to.

In the panel, this shows up as a plain label between the container's own sections and its children's shared ones, reusing the existing section-title styling rather than a new component:

```tsx
<PropertySections node={node} onFocus={onFieldFocus} onChange={onFieldChange} onCommit={onFieldCommit} />
{uniformNode && (
  <>
    <div className="panel-section">
      <div className="panel-section-title">Contents</div>
    </div>
    <SharedPropertySections node={uniformNode} onFocus={onSharedFieldFocus} onChange={onSharedFieldChange} onCommit={onSharedFieldCommit} />
  </>
)}
```

Without that label, a Group's own "Appearance" (just Opacity, since Group has no fill of its own) sitting directly above its children's "Appearance" (Fill + Opacity, if the children have one) would read as an accidental duplicate rather than two different things.

## Verified

Selected two Text nodes with different starting font families (Georgia and Sans-serif); changing Font in the shared Typography section moved both to the new value in one action, and a single `Cmd+Z` reverted both to their original, individual values. Selected the "Nav Links" group (three Text children, all Sans-serif) and confirmed Position/Appearance for the group itself plus a "Contents" → Typography section for the children; changing Font there updated all three and undid together. Selected "CTA Button" (a Rect + a Text — mixed types) and confirmed no Contents section appears, since there's no well-defined shared schema for a heterogeneous set. No console errors in any case.

## What's deliberately out of scope for this pass

- **True mixed-value display** — fields show the first selected node's value rather than a blank/placeholder when the selection actually disagrees (see "Scoping" above).
- **Heterogeneous multi-selection editing** — even the fields every type nominally shares (like Opacity) aren't shown for a mixed-type selection; the type-uniform boundary was kept simple on purpose.
- **Nested containers** — a container's children get their shared fields shown, but a grandchild's grandchildren (a group inside a group) don't get a second "Contents" level; only one level down from the selected node.
