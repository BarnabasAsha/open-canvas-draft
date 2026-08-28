import { generateId, parseVirtualId } from "@open-canvas/commands";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import {
  createPage as createPageOnServer,
  deletePage as deletePageOnServer,
  renamePage as renamePageOnServer,
} from "../lib/pages";
import { INITIAL_VIEWPORT, type Viewport } from "../utils/coordinates";
import { nextPageName } from "../utils/pageNaming";
import { getComponent } from "./componentsStore";
import { createHistoryManager, type HistoryManager } from "./createHistoryManager";
import { createSceneStore, type SceneStore } from "./createSceneStore";
import { createStore, type Store } from "./createStore";
import { getCurrentProjectId } from "./currentProject";
import { setSaveStatus } from "./saveStatusStore";
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

export const EMPTY_SCENE: SceneGraph = { nodes: {}, rootIds: [] };

function requireCurrentProjectId(): string {
  const projectId = getCurrentProjectId();
  if (!projectId) throw new Error("pagesStore: no current project id set");
  return projectId;
}

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

function createPage(name: string, initialScene: SceneGraph, id: PageId = generateId()): PageBundle {
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
    id,
    name,
    scene,
    selection,
    viewport: createStore<Viewport>(INITIAL_VIEWPORT),
    history: createHistoryManager(scene),
  };
}

// Starts with one blank placeholder page so every hook/component that
// reads pagesStore (LeftSidebar, Canvas, etc.) has something to render
// immediately, with zero "no pages yet" special-casing. CanvasEditorPage's
// mount effect replaces this wholesale via hydratePages() once the real
// project's pages have loaded from the API — so this briefly shows a
// blank canvas, never seedData.ts's demo shapes (that file is kept only
// for the separately-deferred "auto-provision an example project for new
// signups" follow-up, not used as a loading placeholder here).
const placeholderPage = createPage("Page 1", EMPTY_SCENE);

export const pagesStore = createStore<PagesState>({ pages: [placeholderPage], activePageId: placeholderPage.id });

// Replaces the entire page list with real server data — called once by
// CanvasEditorPage's mount effect after fetching a project's pages.
export function hydratePages(pages: { id: PageId; name: string; sceneGraph: SceneGraph }[]): void {
  if (pages.length === 0) return;
  const bundles = pages.map((page) => createPage(page.name, page.sceneGraph, page.id));
  pagesStore.update(() => ({ pages: bundles, activePageId: bundles[0].id }));
}

export function getActivePage(): PageBundle {
  const { pages, activePageId } = pagesStore.getState();
  const active = pages.find((page) => page.id === activePageId);
  // Invariant: activePageId always points at a page in the list (addPage/
  // deletePage/switchToPage all maintain this), so this only trips if that
  // invariant is ever broken elsewhere.
  if (!active) throw new Error(`pagesStore: active page ${activePageId} not found`);
  return active;
}

// Calls the backend first, then mutates local state on success — same
// ordering ProjectsPage.tsx's handleCreate already uses for project
// creation. A failed call leaves the local page list untouched rather
// than showing a page that doesn't actually exist server-side; the
// shared saveStatusStore (also used by pageAutosave.ts) is how the
// failure surfaces, since these are all fire-and-forget from onClick
// handlers with nothing else awaiting or catching them.
export async function addPage(): Promise<void> {
  try {
    const projectId = requireCurrentProjectId();
    const name = nextPageName(pagesStore.getState().pages.map((page) => page.name), "Page");
    const created = await createPageOnServer(projectId, name, EMPTY_SCENE);

    pagesStore.update((state) => {
      const page = createPage(created.name, created.sceneGraph, created.id);
      return { pages: [...state.pages, page], activePageId: page.id };
    });
  } catch {
    setSaveStatus("error");
  }
}

export async function renamePage(id: PageId, name: string): Promise<void> {
  try {
    const projectId = requireCurrentProjectId();
    await renamePageOnServer(projectId, id, name);

    pagesStore.update((state) => ({
      ...state,
      pages: state.pages.map((page) => (page.id === id ? { ...page, name } : page)),
    }));
  } catch {
    setSaveStatus("error");
  }
}

// Never deletes the last remaining page — the file always has at least one.
export async function deletePage(id: PageId): Promise<void> {
  if (pagesStore.getState().pages.length <= 1) return;

  try {
    const projectId = requireCurrentProjectId();
    await deletePageOnServer(projectId, id);

    pagesStore.update((state) => {
      if (state.pages.length <= 1) return state;

      const pages = state.pages.filter((page) => page.id !== id);
      const activePageId = state.activePageId === id ? pages[0].id : state.activePageId;
      return { pages, activePageId };
    });
  } catch {
    setSaveStatus("error");
  }
}

export function switchToPage(id: PageId): void {
  pagesStore.update((state) => (state.activePageId === id || !state.pages.some((page) => page.id === id) ? state : { ...state, activePageId: id }));
}
