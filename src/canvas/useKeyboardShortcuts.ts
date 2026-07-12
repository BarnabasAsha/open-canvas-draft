import { useEffect } from "react";
import { historyManager } from "../store/historyManager";
import { toolManager } from "./tools/toolManager";

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          historyManager.redo();
        } else {
          historyManager.undo();
        }
        return;
      }

      // Don't hijack browser/OS shortcuts that happen to share a letter.
      if (e.metaKey || e.ctrlKey) return;

      // The toolbar covers most of these too now — mnemonics match Figma's
      // own (V select, F frame, Shift+S section, R rectangle, O ellipse,
      // L line, A arrow). No dedicated shortcut for image — placing one
      // needs a file picker anyway, so the toolbar button is enough.
      switch (e.key.toLowerCase()) {
        case "v":
          toolManager.setActiveTool("select");
          break;
        case "f":
          toolManager.setActiveTool("frame");
          break;
        case "s":
          if (e.shiftKey) toolManager.setActiveTool("section");
          break;
        case "r":
          toolManager.setActiveTool("rectangle");
          break;
        case "o":
          toolManager.setActiveTool("ellipse");
          break;
        case "l":
          toolManager.setActiveTool("line");
          break;
        case "a":
          toolManager.setActiveTool("arrow");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
