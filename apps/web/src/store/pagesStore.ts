import { generateId, parseVirtualId } from "@open-canvas/commands";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { INITIAL_VIEWPORT, type Viewport } from "../utils/coordinates";
import { nextPageName } from "../utils/pageNaming";
import { seedScene } from "../utils/seedData";
import { getComponent } from "./componentsStore";
import { createHistoryManager, type HistoryManager } from "./createHistoryManager";
import { createSceneStore, type SceneStore } from "./createSceneStore";
import { createStore, type Store } from "./createStore";
import type { SelectionState } from "./selectionStore";

export type PageId = string;

export interface PageBundle {
  id: PageId;
  name: string;
  scene: SceneStore;
  selection: Store<SelectionState>;
  viewport: Store<Viewport>;
  history: HistoryManager;
}

interface PagesState {
  pages: PageBundle[];
  activePageId: PageId;
}

const emptyScene: SceneGraph = { nodes: {}, rootIds: [] };

// A selected id is either a real graph node, or a "virtual" id
// (`instanceId::defNodeId`, see instanceVirtualId.ts) addressing a node
// inside a component instance's definition — those never appear as keys in
// SceneGraph.nodes, so they need their own validity check.
function isSelectableId(id: NodeId, nodes: Record<NodeId, SceneNode>): boolean {
  if (id in nodes) return true;

  const virtual = parseVirtualId(id);
  if (!virtual) return false;
  const instance = nodes[virtual.instanceId];
  if (!instance || instance.type !== "instance") return false;
  const definition = getComponent(instance.componentId);
  return definition !== undefined && virtual.defNodeId in definition.nodes;
}

function createPage(name: string, initialScene: SceneGraph): PageBundle {
  const scene = createSceneStore(initialScene);
  const selection = createStore<SelectionState>({ selectedIds: new Set(), hoveredId: null });

  // Undo/redo (and every other graph mutation) never touch selection
  // themselves, so a node that's deleted, un-created by undo, or replaced
  // wholesale (Group/Duplicate/Create Component) can leave a stale id
  // behind — surfacing as a phantom "N objects selected" in the properties
  // panel. Pruned reactively here, once, rather than taught to every
  // individual mutation call site.
  scene.subscribe(() => {
    const { nodes } = scene.getState();
    selection.update((state) => {
      const selectedIds = new Set([...state.selectedIds].filter((id) => isSelectableId(id, nodes)));
      const hoveredId = state.hoveredId !== null && isSelectableId(state.hoveredId, nodes) ? state.hoveredId : null;
      if (selectedIds.size === state.selectedIds.size && hoveredId === state.hoveredId) return state;
      return { selectedIds, hoveredId };
    });
  });

  return {
    id: generateId(),
    name,
    scene,
    selection,
    viewport: createStore<Viewport>(INITIAL_VIEWPORT),
    history: createHistoryManager(scene),
  };
}

// The file always starts with exactly one page, seeded with the same
// hero-section demo content the single-scene version of the app used to
// load directly in main.tsx — every page added after this one starts blank.
const firstPage = createPage("Page 1", seedScene);

export const pagesStore = createStore<PagesState>({ pages: [firstPage], activePageId: firstPage.id });

export function getActivePage(): PageBundle {
  const { pages, activePageId } = pagesStore.getState();
  const active = pages.find((page) => page.id === activePageId);
  // Invariant: activePageId always points at a page in the list (addPage/
  // deletePage/switchToPage all maintain this), so this only trips if that
  // invariant is ever broken elsewhere.
  if (!active) throw new Error(`pagesStore: active page ${activePageId} not found`);
  return active;
}

export function addPage(): void {
  pagesStore.update((state) => {
    const name = nextPageName(state.pages.map((page) => page.name), "Page");
    const page = createPage(name, emptyScene);
    return { pages: [...state.pages, page], activePageId: page.id };
  });
}

export function renamePage(id: PageId, name: string): void {
  pagesStore.update((state) => ({
    ...state,
    pages: state.pages.map((page) => (page.id === id ? { ...page, name } : page)),
  }));
}

// Never deletes the last remaining page — the file always has at least one.
export function deletePage(id: PageId): void {
  pagesStore.update((state) => {
    if (state.pages.length <= 1) return state;

    const pages = state.pages.filter((page) => page.id !== id);
    const activePageId = state.activePageId === id ? pages[0].id : state.activePageId;
    return { pages, activePageId };
  });
}

export function switchToPage(id: PageId): void {
  pagesStore.update((state) => (state.activePageId === id || !state.pages.some((page) => page.id === id) ? state : { ...state, activePageId: id }));
}
