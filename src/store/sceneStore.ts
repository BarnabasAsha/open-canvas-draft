import type { NodeId, SceneGraph, SceneNode } from "../types/scene";
import { createStore } from "./createStore";
import { addNodeToGraph, removeNodeFromGraph, reparentNodeInGraph } from "./graphMutations";
import { reconcileGroupBounds } from "./reconcileGroupBounds";

const emptyScene: SceneGraph = { nodes: {}, rootIds: [] };

const store = createStore<SceneGraph>(emptyScene);

// Every write funnels through here — including addNode/removeNode/
// reparentNode below — so a Group's bounds stay reconciled to its children
// after literally any mutation (live drag, resize, delete, undo/redo)
// without every one of those call sites needing to know groups exist.
function update(updater: (graph: SceneGraph) => SceneGraph): void {
  store.update((graph) => reconcileGroupBounds(updater(graph)));
}

// Direct, non-undoable mutations — mirrors how position updates during a
// live drag call store.update() directly. Callers that need these
// undoable (e.g. committing a finished drag or a newly drawn frame) wrap
// the equivalent graphMutations function in a Command instead.
function addNode(node: SceneNode): void {
  update((graph) => addNodeToGraph(graph, node));
}

function removeNode(nodeId: NodeId): void {
  update((graph) => removeNodeFromGraph(graph, nodeId));
}

function reparentNode(nodeId: NodeId, newParentId: NodeId | null): void {
  update((graph) => reparentNodeInGraph(graph, nodeId, newParentId));
}

export const sceneStore = { ...store, update, addNode, removeNode, reparentNode };
