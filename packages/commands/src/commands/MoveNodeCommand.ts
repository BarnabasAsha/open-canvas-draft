import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

// A plain node-value swap (like Phase 4's original version) isn't enough
// once a move can also reparent a node: reparenting can add/remove an id
// from graph.rootIds, which lives on the graph itself, not on any node —
// so rootIds has to be captured and restored alongside the node values or
// undo would revert a node's parentId without putting it back in rootIds,
// silently dropping it from every traversal.
export interface MoveSnapshot {
  nodes: ReadonlyMap<NodeId, SceneNode>;
  rootIds: readonly NodeId[];
}

export function createMoveNodeCommand(before: MoveSnapshot, after: MoveSnapshot): Command {
  return {
    apply: (graph) => applySnapshot(graph, after),
    invert: (graph) => applySnapshot(graph, before),
  };
}

function applySnapshot(graph: SceneGraph, snapshot: MoveSnapshot): SceneGraph {
  const nodes = { ...graph.nodes };
  for (const [id, node] of snapshot.nodes) {
    if (nodes[id]) nodes[id] = node;
  }
  return { nodes, rootIds: [...snapshot.rootIds] };
}
