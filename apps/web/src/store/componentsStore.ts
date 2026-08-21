import type { ComponentDefinition } from "@open-canvas/commands";
import type { ComponentId } from "@open-canvas/schema";
import { createStore } from "./createStore";

export type { ComponentDefinition };

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
