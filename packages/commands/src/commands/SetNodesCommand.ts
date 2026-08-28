import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

// Plural sibling of SetNodeCommand — one undo step for a field edit applied
// to every node in a same-type multi-selection, rather than one step per
// node.
export function createSetNodesCommand(before: Map<NodeId, SceneNode>, after: Map<NodeId, SceneNode>): Command {
  const event: SceneEvent = { type: "setNodes", before: Object.fromEntries(before), after: Object.fromEntries(after) };
  return {
    event,
    apply: (graph) => applySceneEvent(graph, event),
    invert: (graph) => invertSceneEvent(graph, event),
  };
}
