import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import { findCommonAncestor, hasAncestorAmongMembers } from "../graphMutations";
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
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    children: [],
  };

  const originalParents: Record<NodeId, NodeId | null> = {};
  for (const id of memberIds) originalParents[id] = graph.nodes[id]?.parentId ?? null;

  const event: SceneEvent = { type: "groupNodes", groupId, groupNode, parentId, memberIds, originalParents };
  return {
    event,
    apply: (g) => applySceneEvent(g, event),
    invert: (g) => invertSceneEvent(g, event),
  };
}
