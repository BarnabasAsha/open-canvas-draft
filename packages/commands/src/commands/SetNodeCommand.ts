import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

// Generic "swap one node's full value between two captured states" —
// originally written for resize, reused as-is for text-edit commits since
// the shape is identical: one node, one before/after pair.
export function createSetNodeCommand(nodeId: NodeId, before: SceneNode, after: SceneNode): Command {
  const event: SceneEvent = { type: "setNode", nodeId, before, after };
  return {
    event,
    apply: (graph) => applySceneEvent(graph, event),
    invert: (graph) => invertSceneEvent(graph, event),
  };
}
