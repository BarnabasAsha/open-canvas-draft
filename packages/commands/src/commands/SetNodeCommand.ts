import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

// Generic "swap one node's full value between two captured states" —
// originally written for resize, reused as-is for text-edit commits since
// the shape is identical: one node, one before/after pair.
export function createSetNodeCommand(nodeId: NodeId, before: SceneNode, after: SceneNode): Command {
  return {
    apply: (graph) => setNode(graph, nodeId, after),
    invert: (graph) => setNode(graph, nodeId, before),
  };
}

function setNode(graph: SceneGraph, nodeId: NodeId, node: SceneNode): SceneGraph {
  if (!graph.nodes[nodeId]) return graph;
  return { ...graph, nodes: { ...graph.nodes, [nodeId]: node } };
}
