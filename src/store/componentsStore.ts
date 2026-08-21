import type { ComponentId, InstanceNode, NodeId, SceneNode } from "../types/scene";
import { createStore } from "./createStore";

// A saved, reusable composition — structurally identical to a SceneGraph
// (nodes keyed by id) but with a single root rather than an array of root
// ids, since a component definition is always one thing.
export interface ComponentDefinition {
  id: ComponentId;
  name: string;
  width: number;
  height: number;
  rootId: NodeId;
  nodes: Record<NodeId, SceneNode>;
}

interface ComponentsState {
  definitions: Record<ComponentId, ComponentDefinition>;
}

// Document-scoped, like documentStore — every page can place an instance of
// any definition, which a page-scoped SceneGraph (each page has its own,
// see pagesStore.ts) can't offer on its own. Deliberately not routed through
// any page's historyManager: Command.apply/invert is typed against
// SceneGraph specifically, and a definition isn't one. A dedicated small
// undo stack for component edits is a reasonable follow-up, not attempted
// here — same category of deferral as documentStore's own settings.
export const componentsStore = createStore<ComponentsState>({ definitions: {} });

export function registerComponent(definition: ComponentDefinition): void {
  componentsStore.update((state) => ({ definitions: { ...state.definitions, [definition.id]: definition } }));
}

export function getComponent(id: ComponentId): ComponentDefinition | undefined {
  return componentsStore.getState().definitions[id];
}

// One place that builds an InstanceNode from a definition — used both when
// placing a fresh built-in primitive and when "Create Component" replaces a
// selection with an instance, so the two flows can't drift apart on what an
// instance's starting fields should be. Its semantics mirror the
// definition's own root — the natural default until you override it.
export function createInstanceNode(
  id: NodeId,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  definition: ComponentDefinition,
): InstanceNode {
  return {
    id,
    type: "instance",
    name,
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: definition.nodes[definition.rootId]?.semantics ?? null,
    interactions: [],
    componentId: definition.id,
    overrides: {},
  };
}
