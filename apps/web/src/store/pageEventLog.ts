import type { HistoryEntry } from "@open-canvas/commands";
import { appendPageEvents } from "../lib/pages";
import { pagesStore, type PageId } from "./pagesStore";
import { setSaveStatus } from "./saveStatusStore";

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_COUNT_THRESHOLD = 20;

// A secondary, best-effort log — NOT the source of truth for current state
// (that's pageAutosave.ts's whole-scene-graph PUT, untouched by this).
// Losing a few buffered entries to a flaky network blip is an acceptable
// trade-off here in a way it wouldn't be for scene content, so this never
// touches that critical path. Buffers each page's history.subscribe(...)
// entries (see createHistoryManager.ts) and flushes on a time-or-count
// trigger, mirroring pageAutosave.ts's per-page watcher/reconcile shape.
export function initPageEventLog(projectId: string): () => void {
  const buffers = new Map<PageId, HistoryEntry[]>();
  const unsubscribers = new Map<PageId, () => void>();

  function flushPage(pageId: PageId): void {
    const buffer = buffers.get(pageId);
    if (!buffer || buffer.length === 0) return;
    const entries = buffer.splice(0, buffer.length);
    appendPageEvents(projectId, pageId, entries).catch(() => setSaveStatus("error"));
  }

  function flushAll(): void {
    for (const pageId of buffers.keys()) flushPage(pageId);
  }

  function watch(pageId: PageId): void {
    if (unsubscribers.has(pageId)) return;
    const page = pagesStore.getState().pages.find((p) => p.id === pageId);
    if (!page) return;

    buffers.set(pageId, []);
    const unsubscribe = page.history.subscribe((entry) => {
      const buffer = buffers.get(pageId);
      if (!buffer) return;
      buffer.push(entry);
      if (buffer.length >= FLUSH_COUNT_THRESHOLD) flushPage(pageId);
    });
    unsubscribers.set(pageId, unsubscribe);
  }

  function unwatch(pageId: PageId): void {
    const unsubscribe = unsubscribers.get(pageId);
    if (!unsubscribe) return;
    flushPage(pageId);
    unsubscribe();
    unsubscribers.delete(pageId);
    buffers.delete(pageId);
  }

  function reconcile(): void {
    const currentIds = new Set(pagesStore.getState().pages.map((page) => page.id));
    for (const id of currentIds) watch(id);
    for (const id of [...unsubscribers.keys()]) if (!currentIds.has(id)) unwatch(id);
  }

  reconcile();
  const unsubscribePagesStore = pagesStore.subscribe(reconcile);
  const flushTimer = setInterval(flushAll, FLUSH_INTERVAL_MS);

  function handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") flushAll();
  }

  window.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", flushAll);

  return () => {
    unsubscribePagesStore();
    for (const id of [...unsubscribers.keys()]) unwatch(id);
    clearInterval(flushTimer);
    window.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", flushAll);
  };
}
