import { addNodeToGraph, removeNodeFromGraph, reorderChildInGraph, reparentNodeInGraph, resolveFlexLayout } from "@open-canvas/commands";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { createStore, type Store } from "./createStore";
import { reconcileGroupBounds } from "./reconcileGroupBounds";

export interface SceneStore extends Store<SceneGraph> {
  addNode(node: SceneNode): void;
  removeNode(nodeId: NodeId): void;
  reparentNode(nodeId: NodeId, newParentId: NodeId | null): void;
  reorderNode(nodeId: NodeId, newParentId: NodeId | null, index?: number): void;
}

// Factory version of what used to be sceneStore.ts's whole body — every page
// gets its own instance via this, and the module-level `sceneStore` singleton
// (see sceneStore.ts) is now just a facade over whichever page is active.
export function createSceneStore(initial: SceneGraph): SceneStore {
  // Reconciled once up front, same as every subsequent write (see `update`
  // below) — a seed/imported document's group bounds and flex-managed
  // children don't need to be hand-authored to already be self-consistent;
  // whatever's on disk just needs the right structure (children arrays,
  // layoutMode, sizing modes), and the actual x/y/width/height resolve
  // correctly before the very first render, not just after the first edit.
  const store = createStore<SceneGraph>(resolveFlexLayout(reconcileGroupBounds(initial)));

  // Every write funnels through here — including addNode/removeNode/
  // reparentNode below — so a Group's bounds stay reconciled to its children,
  // and every flex container's children stay laid out, after literally any
  // mutation (live drag, resize, delete, undo/redo) without every one of
  // those call sites needing to know groups or flex layout exist. Order
  // matters: groups settle first, so a flex container that happens to
  // contain a Group measures/places against that Group's already-current
  // bounds rather than a stale one.
  function update(updater: (graph: SceneGraph) => SceneGraph): void {
    store.update((graph) => resolveFlexLayout(reconcileGroupBounds(updater(graph))));
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

  function reorderNode(nodeId: NodeId, newParentId: NodeId | null, index?: number): void {
    update((graph) => reorderChildInGraph(graph, nodeId, newParentId, index));
  }

  return { ...store, update, addNode, removeNode, reparentNode, reorderNode };
}
