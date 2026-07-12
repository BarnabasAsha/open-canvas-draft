import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import { createStore } from "./createStore";
import { addNodeToGraph, removeNodeFromGraph, reparentNodeInGraph } from "./graphMutations";

const emptyScene: SceneGraph = { nodes: {}, rootIds: [] };

const store = createStore<SceneGraph>(emptyScene);

// Direct, non-undoable mutations — mirrors how position updates during a
// live drag call store.update() directly. Callers that need these
// undoable (e.g. committing a finished drag or a newly drawn frame) wrap
// the equivalent graphMutations function in a Command instead.
function addNode(node: SceneNode): void {
  store.update((graph) => addNodeToGraph(graph, node));
}

function removeNode(nodeId: NodeId): void {
  store.update((graph) => removeNodeFromGraph(graph, nodeId));
}

function reparentNode(nodeId: NodeId, newParentId: NodeId | null): void {
  store.update((graph) => reparentNodeInGraph(graph, nodeId, newParentId));
}

export const sceneStore = { ...store, addNode, removeNode, reparentNode };
