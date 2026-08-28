import { updatePageScene } from "../lib/pages";
import { debounce, type Debounced } from "../utils/debounce";
import { pagesStore, type PageId } from "./pagesStore";
import { setSaveStatus } from "./saveStatusStore";

const AUTOSAVE_DEBOUNCE_MS = 1000;

// Watches every page currently in pagesStore and PUTs its scene graph to
// the backend shortly after it stops changing. A subscription is attached
// directly to each page's own (always-live) scene store rather than
// through the activePageFacade, so it keeps firing correctly for whichever
// page last changed regardless of which page is active right now.
export function initPageAutosave(projectId: string): () => void {
  const watchers = new Map<PageId, { save: Debounced<[]>; unsubscribe: () => void }>();

  function watch(pageId: PageId): void {
    if (watchers.has(pageId)) return;

    const save = debounce(() => {
      const page = pagesStore.getState().pages.find((p) => p.id === pageId);
      if (!page) return;

      setSaveStatus("saving");
      updatePageScene(projectId, pageId, page.scene.getState())
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, AUTOSAVE_DEBOUNCE_MS);

    const page = pagesStore.getState().pages.find((p) => p.id === pageId);
    const unsubscribe = page ? page.scene.subscribe(save) : () => {};
    watchers.set(pageId, { save, unsubscribe });
  }

  function unwatch(pageId: PageId): void {
    const watcher = watchers.get(pageId);
    if (!watcher) return;
    watcher.save.cancel();
    watcher.unsubscribe();
    watchers.delete(pageId);
  }

  function reconcile(): void {
    const currentIds = new Set(pagesStore.getState().pages.map((page) => page.id));
    for (const id of currentIds) watch(id);
    for (const id of [...watchers.keys()]) if (!currentIds.has(id)) unwatch(id);
  }

  reconcile();
  const unsubscribePagesStore = pagesStore.subscribe(reconcile);

  function flushAll(): void {
    for (const watcher of watchers.values()) watcher.save.flush();
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") flushAll();
  }

  window.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", flushAll);

  return () => {
    unsubscribePagesStore();
    for (const id of [...watchers.keys()]) unwatch(id);
    window.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", flushAll);
  };
}
