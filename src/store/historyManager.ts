import type { Command } from "../commands/Command";
import { getActivePage } from "./pagesStore";

// Thin facade over whichever page is active — same idea as sceneStore.ts's
// facade, just simpler: nothing subscribes to undo/redo state today (no
// visible undo/redo buttons, keyboard-only), so this is a plain
// pass-through with no subscribe/notify machinery needed.
export const historyManager = {
  execute: (command: Command) => getActivePage().history.execute(command),
  undo: () => getActivePage().history.undo(),
  redo: () => getActivePage().history.redo(),
};
