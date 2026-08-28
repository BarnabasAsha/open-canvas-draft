import { createStore, type Store } from "./createStore";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// Shared by pageAutosave.ts (scene-content saves) and pagesStore.ts
// (add/rename/delete-page calls) — one status channel for "did the last
// thing I did to a page actually persist," not a separate one per
// operation kind.
export const saveStatusStore: Store<SaveStatus> = createStore<SaveStatus>("idle");

export function setSaveStatus(status: SaveStatus): void {
  saveStatusStore.update(() => status);
}
