import { useEffect } from "react";
import { historyManager } from "../store/historyManager";
import { frameTool } from "./tools/frameTool";
import { sectionTool } from "./tools/sectionTool";
import { selectTool } from "./tools/selectTool";
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

      // No toolbar UI yet, so these are the only way to reach the frame/
      // section tools — mnemonics match Figma's own (V select, F frame,
      // Shift+S section).
      switch (e.key.toLowerCase()) {
        case "v":
          toolManager.setActiveTool(selectTool);
          break;
        case "f":
          toolManager.setActiveTool(frameTool);
          break;
        case "s":
          if (e.shiftKey) toolManager.setActiveTool(sectionTool);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
