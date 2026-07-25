import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import type { Command } from "./Command";

// Plural sibling of SetNodeCommand — one undo step for a field edit applied
// to every node in a same-type multi-selection, rather than one step per
// node.
export function createSetNodesCommand(before: Map<NodeId, SceneNode>, after: Map<NodeId, SceneNode>): Command {
  return {
    apply: (graph) => setNodes(graph, after),
    invert: (graph) => setNodes(graph, before),
  };
}

function setNodes(graph: SceneGraph, nodes: Map<NodeId, SceneNode>): SceneGraph {
  let next = graph.nodes;
  for (const [id, node] of nodes) {
    if (!next[id]) continue;
    next = { ...next, [id]: node };
  }
  return next === graph.nodes ? graph : { ...graph, nodes: next };
}
