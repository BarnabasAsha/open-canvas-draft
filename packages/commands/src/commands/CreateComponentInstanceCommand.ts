import type { ComponentDefinition } from "../componentTypes";
import { createInstanceNode } from "../componentTypes";
import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import { collectWithDescendants, findCommonAncestor } from "../graphMutations";
import type { Bounds } from "../sceneCorners";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
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
  const removedIds = new Set(idsToRemove);
  const removedNodes: Record<NodeId, SceneNode> = {};
  for (const id of idsToRemove) removedNodes[id] = graph.nodes[id];
  const rootIds = [...graph.rootIds];

  // Same "surviving parent needs its children array patched back" logic
  // DeleteNodesCommand uses — a removed container's own children come back
  // for free when the container itself is restored, only a parent that
  // ISN'T being removed needs explicit repair.
  const survivingParentChildren: Record<NodeId, NodeId[]> = {};
  for (const id of memberIds) {
    const parentId = graph.nodes[id]?.parentId;
    if (!parentId || removedIds.has(parentId) || survivingParentChildren[parentId]) continue;
    const parent = graph.nodes[parentId];
    if (parent && "children" in parent) survivingParentChildren[parentId] = [...parent.children];
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

  const event: SceneEvent = {
    type: "replaceWithInstance",
    idsToRemove,
    removedNodes,
    rootIds,
    survivingParentChildren,
    parentId,
    instanceId,
    instanceNode,
  };
  return {
    event,
    apply: (g) => applySceneEvent(g, event),
    invert: (g) => invertSceneEvent(g, event),
  };
}
