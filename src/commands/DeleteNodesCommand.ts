import { collectWithDescendants, removeNodesFromGraph } from "../store/graphMutations";
import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import type { Command } from "./Command";

export function createDeleteNodesCommand(graph: SceneGraph, nodeIds: NodeId[]): Command {
  const idsToRemove = collectWithDescendants(graph, nodeIds);
  const removedIds = new Set(idsToRemove);
  const removedNodes = new Map(idsToRemove.map((id) => [id, graph.nodes[id]]));
  const rootIds = graph.rootIds;

  // A deleted container's children come back for free when the container
  // node itself is restored below, since it still holds its original
  // children array — only a SURVIVING parent needs its children array
  // explicitly patched back to include the removed id at its old spot.
  const survivingParentChildren = new Map<NodeId, readonly NodeId[]>();
  for (const id of nodeIds) {
    const parentId = graph.nodes[id]?.parentId;
    if (!parentId || removedIds.has(parentId) || survivingParentChildren.has(parentId)) continue;
    const parent = graph.nodes[parentId];
    if (parent && "children" in parent) survivingParentChildren.set(parentId, parent.children);
  }

  return {
    apply: (g) => removeNodesFromGraph(g, idsToRemove),
    invert: (g) => restoreNodes(g, removedNodes, rootIds, survivingParentChildren),
  };
}

function restoreNodes(
  graph: SceneGraph,
  removedNodes: ReadonlyMap<NodeId, SceneNode>,
  rootIds: readonly NodeId[],
  survivingParentChildren: ReadonlyMap<NodeId, readonly NodeId[]>,
): SceneGraph {
  const nodes = { ...graph.nodes };

  for (const [id, node] of removedNodes) nodes[id] = node;

  for (const [parentId, children] of survivingParentChildren) {
    const parent = nodes[parentId];
    if (parent && "children" in parent) nodes[parentId] = { ...parent, children: [...children] };
  }

  return { nodes, rootIds: [...rootIds] };
}
