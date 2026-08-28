import type { Command, HistoryEntry } from "@open-canvas/commands";
import type { SceneGraph } from "@open-canvas/schema";
import type { Store } from "./createStore";

export interface HistoryManager {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  // Notified with every execute/undo/redo call, mirrored as a serializable
  // HistoryEntry — same Set-of-listeners shape createStore already uses.
  // This is what lets an external module (pageEventLog.ts) log a page's
  // edit history without HistoryManager itself knowing anything about
  // logging/persistence.
  subscribe(listener: (entry: HistoryEntry) => void): () => void;
}

// Factory version of what used to be historyManager.ts's whole body — each
// page gets its own undo/redo stack, committed against its own scene store
// (the `scene` parameter) rather than a single hard-imported one. The
// module-level `historyManager` singleton (see historyManager.ts) is now a
// facade over whichever page is active.
export function createHistoryManager(scene: Store<SceneGraph>): HistoryManager {
  const undoStack: Command[] = [];
  let redoStack: Command[] = [];
  const listeners = new Set<(entry: HistoryEntry) => void>();

  function notify(entry: HistoryEntry): void {
    for (const listener of listeners) listener(entry);
  }

  function execute(command: Command): void {
    scene.update((graph) => command.apply(graph));
    undoStack.push(command);
    redoStack = [];
    notify({ kind: "execute", event: command.event });
  }

  function undo(): void {
    const command = undoStack.pop();
    if (!command) return;

    scene.update((graph) => command.invert(graph));
    redoStack.push(command);
    notify({ kind: "undo" });
  }

  function redo(): void {
    const command = redoStack.pop();
    if (!command) return;

    scene.update((graph) => command.apply(graph));
    undoStack.push(command);
    notify({ kind: "redo" });
  }

  function subscribe(listener: (entry: HistoryEntry) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { execute, undo, redo, subscribe };
}
