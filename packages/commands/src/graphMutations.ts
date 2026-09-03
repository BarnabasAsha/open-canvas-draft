import type { ContainerNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { getWorldMatrix, transformPoint } from "./worldTransform";

// Mirrors removeNodeFromGraph's own symmetric logic (below) — a node whose
// parentId is already set to a real container is inserted directly into
// that container's children, not appended to rootIds regardless. Every
// existing caller builds nodes with parentId: null (root-level placement),
// so this is purely additive: nothing that already worked changes.
export function addNodeToGraph(graph: SceneGraph, node: SceneNode): SceneGraph {
  if (graph.nodes[node.id]) return graph;
  const nodes = { ...graph.nodes, [node.id]: node };

  const container = getContainer(graph, node.parentId);
  if (container) {
    return {
      nodes: { ...nodes, [container.id]: { ...container, children: [...container.children, node.id] } },
      rootIds: graph.rootIds,
    };
  }

  return { nodes, rootIds: node.parentId ? graph.rootIds : [...graph.rootIds, node.id] };
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

  nodes[nodeId] = reparentedNode(graph, node, newParentId);
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

  // Same coordinate-space re-expression as reparentNodeInGraph — only
  // needed when the parent actually changed; a same-parent reorder is a
  // pure array-order change with no coordinate implications.
  nodes[nodeId] = reparentedNode(graph, node, newParentId);
  return { nodes, rootIds };
}

// Re-expresses a node's own anchor (and, for line/arrow, its second
// endpoint) in the new parent's local coordinate space via a full
// world-matrix round-trip — old-parent-local -> world -> new-parent-local
// — rather than a plain origin-point subtraction. The old approach only
// accounted for translation between the two parents' origins; this is
// exact even when either parent is rotated, composing through
// getWorldMatrix's own rotate-around-center chain the same way rendering
// already does. `graph` (not the in-progress `nodes` map being built by
// the caller) is used for both matrix lookups so a parent's own
// rotation/position is read from its pre-mutation state — correct, since
// neither the old nor new container's own transform is what's changing
// here, only which one owns this node.
function reparentedNode(graph: SceneGraph, node: SceneNode, newParentId: NodeId | null): SceneNode {
  const oldMatrix = node.parentId ? getWorldMatrix(node.parentId, graph.nodes) : new DOMMatrix();
  const newMatrix = newParentId ? getWorldMatrix(newParentId, graph.nodes) : new DOMMatrix();
  const toNewLocal = newMatrix.inverse().multiply(oldMatrix);

  const anchor = transformPoint(toNewLocal, { x: node.x, y: node.y });
  if (node.type === "line" || node.type === "arrow") {
    const endpoint = transformPoint(toNewLocal, { x: node.x2, y: node.y2 });
    return { ...node, parentId: newParentId, x: anchor.x, y: anchor.y, x2: endpoint.x, y2: endpoint.y };
  }
  return { ...node, parentId: newParentId, x: anchor.x, y: anchor.y };
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

// A node is effectively locked if it — or any ancestor — is locked, even
// though only the ancestor's own `locked` field is actually set to true.
// A derived check, never written back onto the descendant's own node (so
// a child doesn't need to stay in sync with its container's lock state):
// used wherever a lock needs to block an action (move/resize/reparent-into)
// on a node whose container is locked, without that container's lock
// being selectable/inspectable-only in the same way its own lock already is.
export function isEffectivelyLocked(graph: SceneGraph, nodeId: NodeId): boolean {
  let current: NodeId | null = nodeId;
  while (current) {
    const node: SceneNode | undefined = graph.nodes[current];
    if (!node) return false;
    if (node.locked) return true;
    current = node.parentId;
  }
  return false;
}

export function isAncestor(graph: SceneGraph, candidateAncestorId: NodeId, nodeId: NodeId): boolean {
  let current: NodeId | null = graph.nodes[nodeId]?.parentId ?? null;
  while (current) {
    if (current === candidateAncestorId) return true;
    current = graph.nodes[current]?.parentId ?? null;
  }
  return false;
}

// Shared by GroupNodesCommand, componentMutations, and DuplicateNodesCommand
// — each needs to reject a member set where one selected node is nested
// inside another (grouping/extracting/duplicating "a frame and something
// already inside it" together isn't a well-defined operation).
export function hasAncestorAmongMembers(graph: SceneGraph, memberIds: readonly NodeId[]): boolean {
  for (const a of memberIds) {
    for (const b of memberIds) {
      if (a !== b && isAncestor(graph, a, b)) return true;
    }
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
