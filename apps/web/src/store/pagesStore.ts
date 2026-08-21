import { generateId } from "@open-canvas/commands";
import type { SceneGraph } from "@open-canvas/schema";
import { INITIAL_VIEWPORT, type Viewport } from "../utils/coordinates";
import { nextPageName } from "../utils/pageNaming";
import { seedScene } from "../utils/seedData";
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

function createPage(name: string, initialScene: SceneGraph): PageBundle {
  const scene = createSceneStore(initialScene);
  return {
    id: generateId(),
    name,
    scene,
    selection: createStore<SelectionState>({ selectedIds: new Set(), hoveredId: null }),
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
