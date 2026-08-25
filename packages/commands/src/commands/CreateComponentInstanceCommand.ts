import type { ComponentDefinition } from "../componentTypes";
import { createInstanceNode } from "../componentTypes";
import { addNodeToGraph, collectWithDescendants, findCommonAncestor, removeNodesFromGraph, reparentNodeInGraph } from "../graphMutations";
import type { Bounds } from "../sceneCorners";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import type { Command } from "./Command";

// Precondition: memberIds/definition/bounds come from the same
// createComponentDefinition() call this command is meant to replace —
// mirrors GroupNodesCommand's shape (build a new node + reparent/remove the
// members), except members are REMOVED rather than nested, since they now
// live inside the definition instead of the live graph.
export function createReplaceWithInstanceCommand(
  graph: SceneGraph,
  memberIds: NodeId[],
  definition: ComponentDefinition,
  bounds: Bounds,
  instanceId: NodeId,
): Command {
  const idsToRemove = collectWithDescendants(graph, memberIds);
  const removedNodes = new Map(idsToRemove.map((id) => [id, graph.nodes[id]]));
  const removedIds = new Set(idsToRemove);
  const rootIds = graph.rootIds;

  // Same "surviving parent needs its children array patched back" logic
  // DeleteNodesCommand uses — a removed container's own children come back
  // for free when the container itself is restored, only a parent that
  // ISN'T being removed needs explicit repair.
  const survivingParentChildren = new Map<NodeId, readonly NodeId[]>();
  for (const id of memberIds) {
    const parentId = graph.nodes[id]?.parentId;
    if (!parentId || removedIds.has(parentId) || survivingParentChildren.has(parentId)) continue;
    const parent = graph.nodes[parentId];
    if (parent && "children" in parent) survivingParentChildren.set(parentId, parent.children);
  }

  const parentId = findCommonAncestor(graph, memberIds);

  const instanceNode = createInstanceNode(
    instanceId,
    definition.name,
    bounds.minX,
    bounds.minY,
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    definition,
  );

  return {
    apply: (g) => {
      let next = removeNodesFromGraph(g, idsToRemove);
      next = addNodeToGraph(next, instanceNode);
      if (parentId) next = reparentNodeInGraph(next, instanceId, parentId);
      return next;
    },
    invert: (g) => {
      const nodes = { ...g.nodes };
      delete nodes[instanceId];
      for (const [id, node] of removedNodes) nodes[id] = node;
      for (const [pid, children] of survivingParentChildren) {
        const parent = nodes[pid];
        if (parent && "children" in parent) nodes[pid] = { ...parent, children: [...children] };
      }
      return { nodes, rootIds: [...rootIds] };
    },
  };
}
