import type {
  CrossAxisAlign,
  FlexDirection,
  FrameNode,
  NodeId,
  Padding,
  SceneGraph,
  SceneNode,
  SectionNode,
  SizingMode,
} from "@open-canvas/schema";

type FlexContainer = FrameNode | SectionNode;

interface Size {
  width: number;
  height: number;
}

function isFlexContainer(node: SceneNode): node is FlexContainer {
  return (node.type === "frame" || node.type === "section") && node.layoutMode === "flex";
}

// Line/arrow's rendered geometry comes from x/y/x2/y2, not width/height
// (see resizeEndpointNode's own comment on this in canvas/tools/resizeMath.ts
// over in apps/web) — flex treats them as always "fixed" size, only ever
// repositioning them (shifting x2/y2 by the same delta as x/y), never
// resizing them via hug/fill.
function isFixedGeometry(node: SceneNode): boolean {
  return node.type === "line" || node.type === "arrow";
}

function axisSizing(node: SceneNode, axis: "horizontal" | "vertical"): SizingMode {
  if (isFixedGeometry(node)) return "fixed";
  return axis === "horizontal" ? node.sizingHorizontal : node.sizingVertical;
}

function mainOf(width: number, height: number, direction: FlexDirection): number {
  return direction === "row" ? width : height;
}

function crossOf(width: number, height: number, direction: FlexDirection): number {
  return direction === "row" ? height : width;
}

function sizeFrom(main: number, cross: number, direction: FlexDirection): Size {
  return direction === "row" ? { width: main, height: cross } : { width: cross, height: main };
}

function paddingMain(padding: Padding, direction: FlexDirection): number {
  return direction === "row" ? padding.left + padding.right : padding.top + padding.bottom;
}

function paddingCross(padding: Padding, direction: FlexDirection): number {
  return direction === "row" ? padding.top + padding.bottom : padding.left + padding.right;
}

// "hug" uses the recursively-measured size; "fixed" (and, transiently,
// "fill" — overwritten separately once remaining space is known) keeps
// whatever's currently stored on the child.
function naturalSizeFor(sizing: SizingMode, hugValue: number, fixedValue: number): number {
  return sizing === "hug" ? hugValue : fixedValue;
}

// ─── Pass 1: bottom-up natural-size measurement ────────────────────────
//
// A flex container's natural (hug) size is the sum/max of its own flow
// children's natural sizes — recursive, since a nested flex container's
// natural size in turn depends on ITS children. Anything that isn't a
// flex container itself (a `layoutMode:"none"` frame, a Group, or a leaf
// shape) reports its own currently-stored width/height — its size is
// manually managed, not derived from content. This is answering "what
// size would this node need to be if something hugged it," independent
// of how this node's OWN parent actually chooses to use that value —
// Pass 2 is what decides whether a "fixed"-sizing child uses this natural
// value or ignores it in favor of its current stored size.
function measureNaturalSize(
  nodeId: NodeId,
  nodes: Record<NodeId, SceneNode>,
  cache: Map<NodeId, Size>,
): Size {
  const cached = cache.get(nodeId);
  if (cached) return cached;

  const node = nodes[nodeId];
  if (!node) return { width: 0, height: 0 };

  if (!isFlexContainer(node)) {
    const size = { width: node.width, height: node.height };
    cache.set(nodeId, size);
    return size;
  }

  const flowChildIds = node.children.filter((id) => nodes[id]?.positioning === "flow");
  if (flowChildIds.length === 0) {
    const size = {
      width: node.padding.left + node.padding.right,
      height: node.padding.top + node.padding.bottom,
    };
    cache.set(nodeId, size);
    return size;
  }

  let mainTotal = 0;
  let crossMax = 0;
  for (const id of flowChildIds) {
    const childSize = measureNaturalSize(id, nodes, cache);
    mainTotal += mainOf(childSize.width, childSize.height, node.direction);
    crossMax = Math.max(crossMax, crossOf(childSize.width, childSize.height, node.direction));
  }
  mainTotal += node.gap * (flowChildIds.length - 1);

  const size = sizeFrom(
    mainTotal + paddingMain(node.padding, node.direction),
    crossMax + paddingCross(node.padding, node.direction),
    node.direction,
  );
  cache.set(nodeId, size);
  return size;
}

// ─── Pass 2: top-down placement ─────────────────────────────────────────

function applyResolvedGeometry(node: SceneNode, x: number, y: number, width: number, height: number): SceneNode {
  if (node.type === "line" || node.type === "arrow") {
    const dx = x - node.x;
    const dy = y - node.y;
    return { ...node, x, y, x2: node.x2 + dx, y2: node.y2 + dy };
  }
  return { ...node, x, y, width, height };
}

// "fill" always occupies the full cross extent, regardless of alignment.
// "hug" under a "stretch" container also fills — matches CSS
// align-items:stretch only affecting children with no explicit size, and
// "hug" is the closest thing to "no explicit size" in this model. "fixed"
// never stretches — an explicit size always wins, same as CSS.
function resolveCrossSize(sizing: SizingMode, natural: number, contentCross: number, crossAxisAlign: CrossAxisAlign): number {
  if (sizing === "fill") return contentCross;
  if (sizing === "hug" && crossAxisAlign === "stretch") return contentCross;
  return natural;
}

function crossOffsetFor(sizing: SizingMode, crossSize: number, contentCross: number, crossAxisAlign: CrossAxisAlign): number {
  if (sizing === "fill" || (sizing === "hug" && crossAxisAlign === "stretch")) return 0;
  if (crossAxisAlign === "center") return (contentCross - crossSize) / 2;
  if (crossAxisAlign === "end") return contentCross - crossSize;
  return 0; // start, or "stretch" applied to a "fixed" child (explicit size always wins)
}

function placeFlexChildren(
  container: FlexContainer,
  nodes: Record<NodeId, SceneNode>,
  cache: Map<NodeId, Size>,
): Record<NodeId, SceneNode> {
  const flowChildIds = container.children.filter((id) => nodes[id]?.positioning === "flow");
  if (flowChildIds.length === 0) return nodes;

  const { direction, padding, gap, primaryAxisAlign, crossAxisAlign } = container;
  const contentMain = Math.max(mainOf(container.width, container.height, direction) - paddingMain(padding, direction), 0);
  const contentCross = Math.max(crossOf(container.width, container.height, direction) - paddingCross(padding, direction), 0);

  const entries = flowChildIds.map((id) => {
    const child = nodes[id]!;
    // Lazy — only actually recurses/measures for children this container's
    // own placement pass reaches, rather than the whole graph having been
    // pre-measured up front (see resolveFlexLayout's own comment on this).
    const hug = measureNaturalSize(id, nodes, cache);
    const mainSizing = axisSizing(child, direction === "row" ? "horizontal" : "vertical");
    const crossSizing = axisSizing(child, direction === "row" ? "vertical" : "horizontal");
    return {
      id,
      child,
      mainSizing,
      crossSizing,
      // Only meaningful for "fixed"/"hug" — "fill" is resolved separately
      // below from remaining space, once every non-fill child's share of
      // the main axis is known.
      naturalMain: naturalSizeFor(mainSizing, mainOf(hug.width, hug.height, direction), mainOf(child.width, child.height, direction)),
      naturalCross: naturalSizeFor(crossSizing, crossOf(hug.width, hug.height, direction), crossOf(child.width, child.height, direction)),
    };
  });

  const gapTotal = gap * (entries.length - 1);
  const fillCount = entries.filter((entry) => entry.mainSizing === "fill").length;
  const nonFillMain = entries.filter((entry) => entry.mainSizing !== "fill").reduce((sum, entry) => sum + entry.naturalMain, 0);
  const fillMain = fillCount > 0 ? Math.max((contentMain - nonFillMain - gapTotal) / fillCount, 0) : 0;

  const finalMain = entries.map((entry) => (entry.mainSizing === "fill" ? fillMain : entry.naturalMain));
  const finalCross = entries.map((entry) => resolveCrossSize(entry.crossSizing, entry.naturalCross, contentCross, crossAxisAlign));

  const totalMain = finalMain.reduce((a, b) => a + b, 0) + gapTotal;
  const leftover = Math.max(contentMain - totalMain, 0);
  const startOffset = primaryAxisAlign === "center" ? leftover / 2 : primaryAxisAlign === "end" ? leftover : 0;
  const extraGap = primaryAxisAlign === "spaceBetween" && entries.length > 1 ? leftover / (entries.length - 1) : 0;

  let next = nodes;
  let cursor = startOffset;
  for (let i = 0; i < entries.length; i++) {
    const { id, child, crossSizing } = entries[i];
    const mainSize = finalMain[i];
    const crossSize = finalCross[i];
    const crossOffset = crossOffsetFor(crossSizing, crossSize, contentCross, crossAxisAlign);

    const mainStart = (direction === "row" ? padding.left : padding.top) + cursor;
    const crossStart = (direction === "row" ? padding.top : padding.left) + crossOffset;
    const { width, height } = sizeFrom(mainSize, crossSize, direction);
    const x = direction === "row" ? mainStart : crossStart;
    const y = direction === "row" ? crossStart : mainStart;

    next = { ...next, [id]: applyResolvedGeometry(child, x, y, width, height) };
    cursor += mainSize + gap + extraGap;
  }

  return next;
}

// Pre-order: a flex container's own children are only placed once the
// container's OWN final width/height is known. For a traversal root
// that's just its current stored size (nothing assigns a root a size,
// same as a root has no parent to reparent it); for a nested flex child
// it's whatever its parent's own placement pass just resolved for it, so
// recursion into a node's children always happens strictly after that
// node itself has been placed by its parent.
function placeSubtree(nodeId: NodeId, nodes: Record<NodeId, SceneNode>, cache: Map<NodeId, Size>): Record<NodeId, SceneNode> {
  const node = nodes[nodeId];
  if (!node || !("children" in node)) return nodes;

  let next = nodes;
  if (isFlexContainer(node)) {
    next = placeFlexChildren(node, next, cache);
  }

  const current = next[nodeId];
  if (current && "children" in current) {
    for (const childId of current.children) {
      next = placeSubtree(childId, next, cache);
    }
  }

  return next;
}

// Runs after every graph mutation (see apps/web/src/store/createSceneStore.ts),
// same mechanism reconcileGroupBounds already uses for Group — resolves
// every flex container's children into concrete x/y/width/height and
// writes them back into the graph, so rendering/hit-testing/selection/
// undo never need to know layout exists; they just read whatever's on
// the node, exactly as before this feature existed.
//
// Known limitation, matching existing precedent elsewhere in this
// codebase (e.g. resizeMath.ts's rotated-resize TODO): rotation is
// ignored — a rotated flex child is positioned/sized as if rotation were
// 0, same simplification the rest of the resize/selection code already
// accepts.
export function resolveFlexLayout(graph: SceneGraph): SceneGraph {
  const hasFlexContainer = Object.values(graph.nodes).some(
    (node) => (node.type === "frame" || node.type === "section") && node.layoutMode === "flex",
  );
  if (!hasFlexContainer) return graph;

  // Not pre-measured for every node up front — measureNaturalSize is
  // called lazily, only where placeFlexChildren actually needs a "hug"
  // value, so cost stays proportional to how much of the graph is
  // actually flex-relevant rather than total node count.
  const cache = new Map<NodeId, Size>();

  let nodes = graph.nodes;
  for (const rootId of graph.rootIds) {
    nodes = placeSubtree(rootId, nodes, cache);
  }

  return nodes === graph.nodes ? graph : { ...graph, nodes };
}
