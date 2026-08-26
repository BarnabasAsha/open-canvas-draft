import type { ContainerNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { getWorldMatrix } from "./worldTransform";

export function addNodeToGraph(graph: SceneGraph, node: SceneNode): SceneGraph {
  if (graph.nodes[node.id]) return graph;
  return { nodes: { ...graph.nodes, [node.id]: node }, rootIds: [...graph.rootIds, node.id] };
}

export function removeNodeFromGraph(graph: SceneGraph, nodeId: NodeId): SceneGraph {
  const node = graph.nodes[nodeId];
  if (!node) return graph;

  const nodes = { ...graph.nodes };
  delete nodes[nodeId];

  const container = getContainer(graph, node.parentId);
  if (container) {
    nodes[container.id] = { ...container, children: container.children.filter((id) => id !== nodeId) };
  }

  const rootIds = node.parentId ? graph.rootIds : graph.rootIds.filter((id) => id !== nodeId);
  return { nodes, rootIds };
}

// Deleting a frame/section without also deleting its children would leave
// them in the graph with a parentId pointing at nothing — every id here
// (the requested ones plus anything nested inside a deleted container) is
// what actually needs to disappear.
export function collectWithDescendants(graph: SceneGraph, nodeIds: readonly NodeId[]): NodeId[] {
  const result: NodeId[] = [];
  const seen = new Set<NodeId>();
  const stack = [...nodeIds];

  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);

    const node = graph.nodes[id];
    if (!node) continue;

    result.push(id);
    if (isContainer(node)) stack.push(...node.children);
  }

  return result;
}

export function removeNodesFromGraph(graph: SceneGraph, nodeIds: readonly NodeId[]): SceneGraph {
  return nodeIds.reduce(removeNodeFromGraph, graph);
}

export function reparentNodeInGraph(graph: SceneGraph, nodeId: NodeId, newParentId: NodeId | null): SceneGraph {
  const node = graph.nodes[nodeId];
  if (!node || node.parentId === newParentId) return graph;
  if (newParentId === nodeId) return graph;
  if (newParentId && isAncestor(graph, nodeId, newParentId)) return graph; // would create a cycle
  if (newParentId && !getContainer(graph, newParentId)) return graph; // can only reparent into a container

  const nodes = { ...graph.nodes };
  let rootIds = graph.rootIds;

  const oldContainer = getContainer(graph, node.parentId);
  if (oldContainer) {
    nodes[oldContainer.id] = { ...oldContainer, children: oldContainer.children.filter((id) => id !== nodeId) };
  } else {
    rootIds = rootIds.filter((id) => id !== nodeId);
  }

  const newContainer = getContainer(graph, newParentId);
  if (newContainer) {
    nodes[newContainer.id] = { ...newContainer, children: [...newContainer.children, nodeId] };
  } else {
    rootIds = [...rootIds, nodeId];
  }

  // x/y is relative to the parent, so switching parents changes what
  // coordinate space they're read in — without this, the node would jump
  // by however far apart the old and new parent's origins are. Translation
  // only: assumes neither parent is rotated, which holds for every
  // container this app can currently create (frameTool/sectionTool always
  // draw at rotation 0).
  const oldOrigin = getParentOrigin(graph, node.parentId);
  const newOrigin = getParentOrigin(graph, newParentId);
  const shiftX = oldOrigin.x - newOrigin.x;
  const shiftY = oldOrigin.y - newOrigin.y;

  // Line/arrow have a second point of their own (x2/y2, also parent-
  // relative) that needs the exact same shift — missing this left it stale
  // in the old parent's coordinate space, stretching the shape toward
  // wherever that value happened to resolve to under the new parent.
  nodes[nodeId] =
    node.type === "line" || node.type === "arrow"
      ? { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY, x2: node.x2 + shiftX, y2: node.y2 + shiftY }
      : { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY };

  return { nodes, rootIds };
}

// Generalizes reparentNodeInGraph with an explicit insertion index — that
// function always appends and no-ops on a same-parent move, neither of
// which can express "drop this node between its own siblings" (needed for
// flex drag-to-reorder). `index` omitted or out of range appends, matching
// reparentNodeInGraph's own behavior for everything that doesn't care
// about order.
export function reorderChildInGraph(graph: SceneGraph, nodeId: NodeId, newParentId: NodeId | null, index?: number): SceneGraph {
  const node = graph.nodes[nodeId];
  if (!node) return graph;
  if (newParentId === nodeId) return graph;
  if (newParentId && isAncestor(graph, nodeId, newParentId)) return graph; // would create a cycle
  if (newParentId && !getContainer(graph, newParentId)) return graph; // can only reparent into a container

  const parentChanged = node.parentId !== newParentId;
  if (!parentChanged && isNoOpReorder(graph, nodeId, newParentId, index)) return graph;

  const nodes = { ...graph.nodes };
  let rootIds = graph.rootIds;

  const oldContainer = getContainer(graph, node.parentId);
  if (oldContainer) {
    nodes[oldContainer.id] = { ...oldContainer, children: oldContainer.children.filter((id) => id !== nodeId) };
  } else {
    rootIds = rootIds.filter((id) => id !== nodeId);
  }

  // Looked up from the already-updated `nodes`/`rootIds` above (not the
  // original `graph`) so a same-parent reorder splices into the
  // just-filtered array instead of duplicating nodeId.
  const newContainer = getContainer({ nodes, rootIds }, newParentId);
  if (newContainer) {
    const children = [...newContainer.children];
    children.splice(clampIndex(index, children.length), 0, nodeId);
    nodes[newContainer.id] = { ...newContainer, children };
  } else {
    const nextRootIds = [...rootIds];
    nextRootIds.splice(clampIndex(index, nextRootIds.length), 0, nodeId);
    rootIds = nextRootIds;
  }

  if (!parentChanged) return { nodes, rootIds };

  // Same coordinate-space shift as reparentNodeInGraph — only needed when
  // the parent actually changed; a same-parent reorder is a pure
  // array-order change with no coordinate implications.
  const oldOrigin = getParentOrigin(graph, node.parentId);
  const newOrigin = getParentOrigin(graph, newParentId);
  const shiftX = oldOrigin.x - newOrigin.x;
  const shiftY = oldOrigin.y - newOrigin.y;

  nodes[nodeId] =
    node.type === "line" || node.type === "arrow"
      ? { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY, x2: node.x2 + shiftX, y2: node.y2 + shiftY }
      : { ...node, parentId: newParentId, x: node.x + shiftX, y: node.y + shiftY };

  return { nodes, rootIds };
}

function clampIndex(index: number | undefined, length: number): number {
  if (index === undefined) return length;
  return Math.max(0, Math.min(index, length));
}

// Same-parent reorder request that would land the node back exactly where
// it already sits — without this, every call (e.g. one per pointermove
// while dragging within an already-flex parent) rebuilds the container's
// children array and churns node references even when nothing actually
// moved, which downstream reference-equality checks (e.g. commitMove's
// diff) would otherwise mistake for a real change and push a no-op undo
// step for.
function isNoOpReorder(graph: SceneGraph, nodeId: NodeId, parentId: NodeId | null, index: number | undefined): boolean {
  const siblings = parentId ? (getContainer(graph, parentId)?.children ?? []) : graph.rootIds;
  const currentIndex = siblings.indexOf(nodeId);
  if (currentIndex === -1) return false;

  const withoutNode = siblings.filter((id) => id !== nodeId);
  return clampIndex(index, withoutNode.length) === currentIndex;
}

export function getParentOrigin(graph: SceneGraph, parentId: NodeId | null): { x: number; y: number } {
  if (!parentId) return { x: 0, y: 0 };

  const matrix = getWorldMatrix(parentId, graph.nodes);
  const origin = matrix.transformPoint(new DOMPoint(0, 0));
  return { x: origin.x, y: origin.y };
}

function isContainer(node: SceneNode): node is ContainerNode {
  return node.type === "frame" || node.type === "section" || node.type === "group";
}

function getContainer(graph: SceneGraph, id: NodeId | null): ContainerNode | null {
  if (!id) return null;
  const node = graph.nodes[id];
  return node && isContainer(node) ? node : null;
}

export function isAncestor(graph: SceneGraph, candidateAncestorId: NodeId, nodeId: NodeId): boolean {
  let current: NodeId | null = graph.nodes[nodeId]?.parentId ?? null;
  while (current) {
    if (current === candidateAncestorId) return true;
    current = graph.nodes[current]?.parentId ?? null;
  }
  return false;
}

function ancestorChain(graph: SceneGraph, nodeId: NodeId): NodeId[] {
  const chain: NodeId[] = [];
  let current = graph.nodes[nodeId]?.parentId ?? null;
  while (current) {
    chain.push(current);
    current = graph.nodes[current]?.parentId ?? null;
  }
  return chain;
}

// Deepest ancestor shared by every given node, or null if their only shared
// ancestor is the root itself — e.g. grouping a root-level shape with one
// already nested inside a Frame lands the new group at whichever level both
// of them sit under, root included.
export function findCommonAncestor(graph: SceneGraph, nodeIds: readonly NodeId[]): NodeId | null {
  if (nodeIds.length === 0) return null;

  const [first, ...rest] = nodeIds;
  let common = ancestorChain(graph, first);
  for (const id of rest) {
    const chainSet = new Set(ancestorChain(graph, id));
    common = common.filter((ancestorId) => chainSet.has(ancestorId));
  }
  return common[0] ?? null;
}
