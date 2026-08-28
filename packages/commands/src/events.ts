import type { GroupNode, InstanceNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { addNodeToGraph, removeNodeFromGraph, removeNodesFromGraph, reparentNodeInGraph } from "./graphMutations";

// A serializable description of what a Command does — every field here is
// plain JSON-safe data (objects/arrays, no Map/Set), so a SceneEvent can be
// logged, sent to the backend, and folded back into a graph later (see
// replay.ts), unlike the Command closures that wrap them. One variant per
// existing command type; each carries exactly the "before"/"after" data
// that command already computed internally before this refactor — nothing
// new is captured, it's just named and exposed instead of closed over.
export type SceneEvent =
  | { type: "addNode"; node: SceneNode }
  | { type: "moveNode"; before: MoveSnapshotData; after: MoveSnapshotData }
  | { type: "setNode"; nodeId: NodeId; before: SceneNode; after: SceneNode }
  | { type: "setNodes"; before: Record<NodeId, SceneNode>; after: Record<NodeId, SceneNode> }
  | {
      type: "deleteNodes";
      idsToRemove: NodeId[];
      removedNodes: Record<NodeId, SceneNode>;
      rootIds: NodeId[];
      survivingParentChildren: Record<NodeId, NodeId[]>;
    }
  | {
      type: "duplicateNodes";
      memberIds: NodeId[];
      idMap: Record<NodeId, NodeId>;
      clonedNodes: Record<NodeId, SceneNode>;
    }
  | {
      type: "groupNodes";
      groupId: NodeId;
      groupNode: GroupNode;
      parentId: NodeId | null;
      memberIds: NodeId[];
      originalParents: Record<NodeId, NodeId | null>;
    }
  | { type: "ungroupNodes"; groupId: NodeId; memberIds: NodeId[]; parentId: NodeId | null; capturedGroup: GroupNode }
  | {
      type: "replaceWithInstance";
      idsToRemove: NodeId[];
      removedNodes: Record<NodeId, SceneNode>;
      rootIds: NodeId[];
      survivingParentChildren: Record<NodeId, NodeId[]>;
      parentId: NodeId | null;
      instanceId: NodeId;
      instanceNode: InstanceNode;
    }
  | { type: "reorderToEdge"; originalArrays: Record<string, NodeId[]>; newArrays: Record<string, NodeId[]> };

export interface MoveSnapshotData {
  nodes: Record<NodeId, SceneNode>;
  rootIds: NodeId[];
}

// JSON object keys must be strings — this stands in for a null (root-level)
// parentId in reorderToEdge's per-parent array maps.
export const ROOT_KEY = "__root__";

export function applySceneEvent(graph: SceneGraph, event: SceneEvent): SceneGraph {
  switch (event.type) {
    case "addNode":
      return addNodeToGraph(graph, event.node);
    case "moveNode":
      return applyMoveSnapshot(graph, event.after);
    case "setNode":
      return setNode(graph, event.nodeId, event.after);
    case "setNodes":
      return setNodes(graph, event.after);
    case "deleteNodes":
      return removeNodesFromGraph(graph, event.idsToRemove);
    case "duplicateNodes":
      return applyDuplicate(graph, event);
    case "groupNodes":
      return applyGroup(graph, event);
    case "ungroupNodes":
      return applyUngroup(graph, event);
    case "replaceWithInstance":
      return applyReplaceWithInstance(graph, event);
    case "reorderToEdge":
      return applyChildArrays(graph, event.newArrays);
  }
}

export function invertSceneEvent(graph: SceneGraph, event: SceneEvent): SceneGraph {
  switch (event.type) {
    case "addNode":
      return removeNodeFromGraph(graph, event.node.id);
    case "moveNode":
      return applyMoveSnapshot(graph, event.before);
    case "setNode":
      return setNode(graph, event.nodeId, event.before);
    case "setNodes":
      return setNodes(graph, event.before);
    case "deleteNodes":
      return restoreNodes(graph, event.removedNodes, event.rootIds, event.survivingParentChildren);
    case "duplicateNodes":
      return removeNodesFromGraph(
        graph,
        event.memberIds.map((id) => event.idMap[id]),
      );
    case "groupNodes":
      return invertGroup(graph, event);
    case "ungroupNodes":
      return invertUngroup(graph, event);
    case "replaceWithInstance":
      return invertReplaceWithInstance(graph, event);
    case "reorderToEdge":
      return applyChildArrays(graph, event.originalArrays);
  }
}

// --- addNode / moveNode / setNode / setNodes -------------------------------

function applyMoveSnapshot(graph: SceneGraph, snapshot: MoveSnapshotData): SceneGraph {
  const nodes = { ...graph.nodes };
  for (const [id, node] of Object.entries(snapshot.nodes)) {
    if (nodes[id]) nodes[id] = node;
  }
  return { nodes, rootIds: [...snapshot.rootIds] };
}

function setNode(graph: SceneGraph, nodeId: NodeId, node: SceneNode): SceneGraph {
  if (!graph.nodes[nodeId]) return graph;
  return { ...graph, nodes: { ...graph.nodes, [nodeId]: node } };
}

function setNodes(graph: SceneGraph, nodes: Record<NodeId, SceneNode>): SceneGraph {
  let next = graph.nodes;
  for (const [id, node] of Object.entries(nodes)) {
    if (!next[id]) continue;
    next = { ...next, [id]: node };
  }
  return next === graph.nodes ? graph : { ...graph, nodes: next };
}

// --- deleteNodes / replaceWithInstance shared restore logic ----------------

function restoreNodes(
  graph: SceneGraph,
  removedNodes: Record<NodeId, SceneNode>,
  rootIds: NodeId[],
  survivingParentChildren: Record<NodeId, NodeId[]>,
): SceneGraph {
  const nodes = { ...graph.nodes };

  for (const [id, node] of Object.entries(removedNodes)) nodes[id] = node;

  for (const [parentId, children] of Object.entries(survivingParentChildren)) {
    const parent = nodes[parentId];
    if (parent && "children" in parent) nodes[parentId] = { ...parent, children: [...children] };
  }

  return { nodes, rootIds: [...rootIds] };
}

// --- duplicateNodes ----------------------------------------------------------

function applyDuplicate(graph: SceneGraph, event: Extract<SceneEvent, { type: "duplicateNodes" }>): SceneGraph {
  let nodes: Record<NodeId, SceneNode> = { ...graph.nodes, ...event.clonedNodes };
  let rootIds = graph.rootIds;

  for (const oldId of event.memberIds) {
    const newId = event.idMap[oldId];
    const parentId = graph.nodes[oldId]?.parentId ?? null;

    if (parentId) {
      const parent = nodes[parentId];
      if (parent && "children" in parent) {
        const index = parent.children.indexOf(oldId);
        const children = [...parent.children];
        children.splice(index + 1, 0, newId);
        nodes = { ...nodes, [parentId]: { ...parent, children } };
      }
    } else {
      const index = rootIds.indexOf(oldId);
      const next = [...rootIds];
      next.splice(index + 1, 0, newId);
      rootIds = next;
    }
  }

  return { nodes, rootIds };
}

// --- groupNodes / ungroupNodes ----------------------------------------------

function applyGroup(graph: SceneGraph, event: Extract<SceneEvent, { type: "groupNodes" }>): SceneGraph {
  let next = addNodeToGraph(graph, event.groupNode);
  if (event.parentId) next = reparentNodeInGraph(next, event.groupId, event.parentId);
  for (const id of event.memberIds) next = reparentNodeInGraph(next, id, event.groupId);
  return next;
}

function invertGroup(graph: SceneGraph, event: Extract<SceneEvent, { type: "groupNodes" }>): SceneGraph {
  let next = graph;
  for (const id of event.memberIds) next = reparentNodeInGraph(next, id, event.originalParents[id] ?? null);
  return removeNodeFromGraph(next, event.groupId);
}

function applyUngroup(graph: SceneGraph, event: Extract<SceneEvent, { type: "ungroupNodes" }>): SceneGraph {
  let next = graph;
  for (const id of event.memberIds) next = reparentNodeInGraph(next, id, event.parentId);
  return removeNodeFromGraph(next, event.groupId);
}

function invertUngroup(graph: SceneGraph, event: Extract<SceneEvent, { type: "ungroupNodes" }>): SceneGraph {
  let next = addNodeToGraph(graph, { ...event.capturedGroup, parentId: null, children: [] });
  if (event.parentId) next = reparentNodeInGraph(next, event.groupId, event.parentId);
  for (const id of event.memberIds) next = reparentNodeInGraph(next, id, event.groupId);
  return next;
}

// --- replaceWithInstance -----------------------------------------------------

function applyReplaceWithInstance(graph: SceneGraph, event: Extract<SceneEvent, { type: "replaceWithInstance" }>): SceneGraph {
  let next = removeNodesFromGraph(graph, event.idsToRemove);
  next = addNodeToGraph(next, event.instanceNode);
  if (event.parentId) next = reparentNodeInGraph(next, event.instanceId, event.parentId);
  return next;
}

function invertReplaceWithInstance(graph: SceneGraph, event: Extract<SceneEvent, { type: "replaceWithInstance" }>): SceneGraph {
  const nodes = { ...graph.nodes };
  delete nodes[event.instanceId];
  for (const [id, node] of Object.entries(event.removedNodes)) nodes[id] = node;
  for (const [parentId, children] of Object.entries(event.survivingParentChildren)) {
    const parent = nodes[parentId];
    if (parent && "children" in parent) nodes[parentId] = { ...parent, children: [...children] };
  }
  return { nodes, rootIds: [...event.rootIds] };
}

// --- reorderToEdge -----------------------------------------------------------

function applyChildArrays(graph: SceneGraph, arrays: Record<string, NodeId[]>): SceneGraph {
  let nodes: Record<NodeId, SceneNode> = graph.nodes;
  let rootIds = graph.rootIds;

  for (const [key, children] of Object.entries(arrays)) {
    if (key === ROOT_KEY) {
      rootIds = [...children];
      continue;
    }
    const parent = nodes[key];
    if (parent && "children" in parent) {
      nodes = { ...nodes, [key]: { ...parent, children: [...children] } };
    }
  }

  return { nodes, rootIds };
}
