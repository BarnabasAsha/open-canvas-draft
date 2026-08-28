import { applySceneEvent, invertSceneEvent, type SceneEvent } from "../events";
import type { SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

export function createAddNodeCommand(node: SceneNode): Command {
  const event: SceneEvent = { type: "addNode", node };
  return {
    event,
    apply: (graph) => applySceneEvent(graph, event),
    invert: (graph) => invertSceneEvent(graph, event),
  };
}
