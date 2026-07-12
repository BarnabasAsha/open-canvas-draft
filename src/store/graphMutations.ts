import type { ContainerNode, NodeId, SceneGraph, SceneNode } from "../types/scene";
import { getWorldMatrix } from "../utils/worldTransform";

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
  nodes[nodeId] = {
    ...node,
    parentId: newParentId,
    x: node.x + oldOrigin.x - newOrigin.x,
    y: node.y + oldOrigin.y - newOrigin.y,
  };

  return { nodes, rootIds };
}

export function getParentOrigin(graph: SceneGraph, parentId: NodeId | null): { x: number; y: number } {
  if (!parentId) return { x: 0, y: 0 };

  const matrix = getWorldMatrix(parentId, graph.nodes);
  const origin = matrix.transformPoint(new DOMPoint(0, 0));
  return { x: origin.x, y: origin.y };
}

function isContainer(node: SceneNode): node is ContainerNode {
  return node.type === "frame" || node.type === "section";
}

function getContainer(graph: SceneGraph, id: NodeId | null): ContainerNode | null {
  if (!id) return null;
  const node = graph.nodes[id];
  return node && isContainer(node) ? node : null;
}

function isAncestor(graph: SceneGraph, candidateAncestorId: NodeId, nodeId: NodeId): boolean {
  let current: NodeId | null = graph.nodes[nodeId]?.parentId ?? null;
  while (current) {
    if (current === candidateAncestorId) return true;
    current = graph.nodes[current]?.parentId ?? null;
  }
  return false;
}
