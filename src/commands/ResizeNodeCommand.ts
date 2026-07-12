import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import type { Command } from "./Command";

export function createResizeNodeCommand(nodeId: NodeId, before: SceneNode, after: SceneNode): Command {
  return {
    apply: (graph) => setNode(graph, nodeId, after),
    invert: (graph) => setNode(graph, nodeId, before),
  };
}

function setNode(graph: SceneGraph, nodeId: NodeId, node: SceneNode): SceneGraph {
  if (!graph.nodes[nodeId]) return graph;
  return { ...graph, nodes: { ...graph.nodes, [nodeId]: node } };
}
