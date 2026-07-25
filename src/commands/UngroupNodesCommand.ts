import { addNodeToGraph, removeNodeFromGraph, reparentNodeInGraph } from "../store/graphMutations";
import type { NodeId, SceneGraph } from "../types/scene";
import type { Command } from "./Command";

// Caller ensures groupId actually refers to a "group" node before calling.
export function createUngroupNodesCommand(graph: SceneGraph, groupId: NodeId): Command | null {
  const group = graph.nodes[groupId];
  if (!group || group.type !== "group") return null;

  const memberIds = [...group.children];
  const parentId = group.parentId;
  const capturedGroup = group;

  return {
    apply: (g) => {
      let next = g;
      for (const id of memberIds) next = reparentNodeInGraph(next, id, parentId);
      return removeNodeFromGraph(next, groupId);
    },
    invert: (g) => {
      // Re-added with parentId: null / children: [] regardless of the
      // captured node's real values — addNodeToGraph always lands a new
      // node at root, and reparentNodeInGraph no-ops if the node's own
      // parentId field already matches the target, so both fields have to
      // start "empty" and get filled by the explicit reparent steps below,
      // the same way GroupNodesCommand builds a fresh group.
      let next = addNodeToGraph(g, { ...capturedGroup, parentId: null, children: [] });
      if (parentId) next = reparentNodeInGraph(next, groupId, parentId);
      for (const id of memberIds) next = reparentNodeInGraph(next, id, groupId);
      return next;
    },
  };
}
