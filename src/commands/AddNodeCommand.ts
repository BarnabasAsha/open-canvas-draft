import { addNodeToGraph, removeNodeFromGraph } from "../store/graphMutations";
import type { SceneNode } from "../types/scene";
import type { Command } from "./Command";

export function createAddNodeCommand(node: SceneNode): Command {
  return {
    apply: (graph) => addNodeToGraph(graph, node),
    invert: (graph) => removeNodeFromGraph(graph, node.id),
  };
}
