import { addNodeToGraph, removeNodeFromGraph, reparentNodeInGraph } from "@open-canvas/commands";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { createStore, type Store } from "./createStore";
import { reconcileGroupBounds } from "./reconcileGroupBounds";

export interface SceneStore extends Store<SceneGraph> {
  addNode(node: SceneNode): void;
  removeNode(nodeId: NodeId): void;
  reparentNode(nodeId: NodeId, newParentId: NodeId | null): void;
}

// Factory version of what used to be sceneStore.ts's whole body — every page
// gets its own instance via this, and the module-level `sceneStore` singleton
// (see sceneStore.ts) is now just a facade over whichever page is active.
export function createSceneStore(initial: SceneGraph): SceneStore {
  const store = createStore<SceneGraph>(initial);

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

  return { ...store, update, addNode, removeNode, reparentNode };
}
