import { useEffect } from "react";
import { historyManager } from "../store/historyManager";

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const isUndoRedo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z";
      if (!isUndoRedo) return;

      e.preventDefault();
      if (e.shiftKey) {
        historyManager.redo();
      } else {
        historyManager.undo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
