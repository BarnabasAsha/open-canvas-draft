import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import { collectWithDescendants } from "../graphMutations";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

export function createDeleteNodesCommand(graph: SceneGraph, nodeIds: NodeId[]): Command {
  const idsToRemove = collectWithDescendants(graph, nodeIds);
  const removedIds = new Set(idsToRemove);
  const removedNodes: Record<NodeId, SceneNode> = {};
  for (const id of idsToRemove) removedNodes[id] = graph.nodes[id];
  const rootIds = [...graph.rootIds];

  // A deleted container's children come back for free when the container
  // node itself is restored below, since it still holds its original
  // children array — only a SURVIVING parent needs its children array
  // explicitly patched back to include the removed id at its old spot.
  const survivingParentChildren: Record<NodeId, NodeId[]> = {};
  for (const id of nodeIds) {
    const parentId = graph.nodes[id]?.parentId;
    if (!parentId || removedIds.has(parentId) || survivingParentChildren[parentId]) continue;
    const parent = graph.nodes[parentId];
    if (parent && "children" in parent) survivingParentChildren[parentId] = [...parent.children];
  }

  const event: SceneEvent = { type: "deleteNodes", idsToRemove, removedNodes, rootIds, survivingParentChildren };
  return {
    event,
    apply: (g) => applySceneEvent(g, event),
    invert: (g) => invertSceneEvent(g, event),
  };
}
