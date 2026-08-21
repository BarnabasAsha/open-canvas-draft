import { addNodeToGraph, findCommonAncestor, isAncestor, removeNodeFromGraph, reparentNodeInGraph } from "../graphMutations";
import { generateId } from "../id";
import { nextDefaultName } from "../nodeNaming";
import { getGroupBounds } from "../sceneCorners";
import type { GroupNode, NodeId, SceneGraph } from "@open-canvas/schema";
import type { Command } from "./Command";

// Returns null (caller should simply not execute anything) rather than a
// harmless no-op Command — a no-op would still sit on the undo stack forever.
export function createGroupNodesCommand(graph: SceneGraph, memberIds: NodeId[]): Command | null {
  if (memberIds.length < 2 || hasAncestorAmongMembers(graph, memberIds)) return null;

  const bounds = getGroupBounds(memberIds, graph.nodes);
  if (!bounds) return null;

  const groupId = generateId();
  const parentId = findCommonAncestor(graph, memberIds);

  // x/y set in root/scene space (parentId: null means addNodeToGraph reads
  // them as-is) — the reparent-into-parentId step below does the one correct
  // local-space conversion via reparentNodeInGraph, so don't pre-translate
  // here too or the origin gets subtracted twice.
  const groupNode: GroupNode = {
    id: groupId,
    type: "group",
    name: nextDefaultName(graph, "Group"),
    parentId: null,
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    children: [],
  };

  const originalParents = new Map(memberIds.map((id) => [id, graph.nodes[id]?.parentId ?? null]));

  return {
    apply: (g) => {
      let next = addNodeToGraph(g, groupNode);
      if (parentId) next = reparentNodeInGraph(next, groupId, parentId);
      for (const id of memberIds) next = reparentNodeInGraph(next, id, groupId);
      return next;
    },
    invert: (g) => {
      let next = g;
      for (const id of memberIds) next = reparentNodeInGraph(next, id, originalParents.get(id) ?? null);
      return removeNodeFromGraph(next, groupId);
    },
  };
}

function hasAncestorAmongMembers(graph: SceneGraph, memberIds: NodeId[]): boolean {
  for (const a of memberIds) {
    for (const b of memberIds) {
      if (a !== b && isAncestor(graph, a, b)) return true;
    }
  }
  return false;
}
