import { addNodeToGraph, removeNodeFromGraph } from "../graphMutations";
import type { SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

export function createAddNodeCommand(node: SceneNode): Command {
  return {
    apply: (graph) => addNodeToGraph(graph, node),
    invert: (graph) => removeNodeFromGraph(graph, node.id),
  };
}
