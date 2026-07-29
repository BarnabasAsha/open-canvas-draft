import type { Command } from "../commands/Command";
import type { SceneGraph } from "../types/scene";
import type { Store } from "./createStore";

export interface HistoryManager {
  execute(command: Command): void;
  undo(): void;
  redo(): void;
}

// Factory version of what used to be historyManager.ts's whole body — each
// page gets its own undo/redo stack, committed against its own scene store
// (the `scene` parameter) rather than a single hard-imported one. The
// module-level `historyManager` singleton (see historyManager.ts) is now a
// facade over whichever page is active.
export function createHistoryManager(scene: Store<SceneGraph>): HistoryManager {
  let undoStack: Command[] = [];
  let redoStack: Command[] = [];

  function execute(command: Command): void {
    scene.update((graph) => command.apply(graph));
    undoStack.push(command);
    redoStack = [];
  }

  function undo(): void {
    const command = undoStack.pop();
    if (!command) return;

    scene.update((graph) => command.invert(graph));
    redoStack.push(command);
  }

  function redo(): void {
    const command = redoStack.pop();
    if (!command) return;

    scene.update((graph) => command.apply(graph));
    undoStack.push(command);
  }

  return { execute, undo, redo };
}
