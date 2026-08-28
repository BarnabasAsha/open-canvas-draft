import { applySceneEvent, invertSceneEvent, type MoveSnapshotData, type SceneEvent } from "../events";
import type { NodeId, SceneNode } from "@open-canvas/schema";
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

function toSnapshotData(snapshot: MoveSnapshot): MoveSnapshotData {
  return { nodes: Object.fromEntries(snapshot.nodes), rootIds: [...snapshot.rootIds] };
}

export function createMoveNodeCommand(before: MoveSnapshot, after: MoveSnapshot): Command {
  const event: SceneEvent = { type: "moveNode", before: toSnapshotData(before), after: toSnapshotData(after) };
  return {
    event,
    apply: (graph) => applySceneEvent(graph, event),
    invert: (graph) => invertSceneEvent(graph, event),
  };
}
