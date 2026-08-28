import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import type { Command } from "./Command";

// Caller ensures groupId actually refers to a "group" node before calling.
export function createUngroupNodesCommand(graph: SceneGraph, groupId: NodeId): Command | null {
  const group = graph.nodes[groupId];
  if (!group || group.type !== "group") return null;

  const memberIds = [...group.children];
  const parentId = group.parentId;
  const capturedGroup = group;

  const event: SceneEvent = { type: "ungroupNodes", groupId, memberIds, parentId, capturedGroup };
  return {
    event,
    apply: (g) => applySceneEvent(g, event),
    invert: (g) => invertSceneEvent(g, event),
  };
}
