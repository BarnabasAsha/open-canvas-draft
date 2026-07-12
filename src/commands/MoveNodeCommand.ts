import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import type { Command } from "./Command";

export function createMoveNodeCommand(
  before: ReadonlyMap<NodeId, SceneNode>,
  after: ReadonlyMap<NodeId, SceneNode>,
): Command {
  return {
    apply: (graph) => setNodes(graph, after),
    invert: (graph) => setNodes(graph, before),
  };
}

function setNodes(graph: SceneGraph, states: ReadonlyMap<NodeId, SceneNode>): SceneGraph {
  const nodes = { ...graph.nodes };
  for (const [id, node] of states) {
    if (nodes[id]) nodes[id] = node;
  }
  return { ...graph, nodes };
}
