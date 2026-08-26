import { useEffect } from "react";
import { historyManager } from "../store/historyManager";
import { documentStore } from "../store/documentStore";
import { viewportStore } from "../store/viewportStore";
import { INITIAL_VIEWPORT } from "../utils/coordinates";
import { canvasSizeStore } from "./canvasSizeStore";
import { createComponentFromSelection, deleteSelection, groupSelection, ungroupSelection } from "./selectionActions";
import { toolManager } from "./tools/toolManager";
import { zoomAtPoint } from "./viewportControls";

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // This listener is on window, so every keystroke reaches it —
      // including ones typed into the text-edit overlay's textarea. Without
      // this guard, typing "r"/"v"/"o"/etc. while editing text would also
      // switch tools, and Cmd+Z would hijack the textarea's own native undo
      // instead of letting it work normally.
      if (isTextInput(e.target)) return;

      // Give the active tool first look — currently only penTool cares
      // (Enter finishes an open path, Escape cancels it), and neither key
      // collides with anything below.
      toolManager.onKeyDown(e);

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteSelection();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          historyManager.redo();
        } else {
          historyManager.undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelection();
        } else {
          groupSelection();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        createComponentFromSelection();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "'") {
        e.preventDefault();
        documentStore.update((settings) => ({ ...settings, gridVisible: !settings.gridVisible }));
        return;
      }

      // Keyboard zoom has no cursor position to anchor to (unlike the wheel
      // handler in Canvas.tsx), so it zooms toward the center of whatever's
      // currently visible instead.
      if ((e.metaKey || e.ctrlKey) && (e.key === "0" || e.key === "=" || e.key === "+" || e.key === "-" || e.key === "_")) {
        e.preventDefault();
        if (e.key === "0") {
          viewportStore.update(() => INITIAL_VIEWPORT);
          return;
        }
        const { width, height } = canvasSizeStore.getState();
        const center = { x: width / 2, y: height / 2 };
        const factor = e.key === "=" || e.key === "+" ? 1.2 : 1 / 1.2;
        viewportStore.update((viewport) => zoomAtPoint(viewport, center, factor));
        return;
      }

      // Don't hijack browser/OS shortcuts that happen to share a letter.
      if (e.metaKey || e.ctrlKey) return;

      // The toolbar covers most of these too now — mnemonics match Figma's
      // own (V select, F frame, Shift+S section, R rectangle, Shift+R
      // ruler, O ellipse, L line, A arrow, P pen, T text). No dedicated
      // shortcut for image — placing one needs a file picker anyway, so the
      // toolbar button is enough.
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
          if (e.shiftKey) {
            documentStore.update((settings) => ({ ...settings, rulerVisible: !settings.rulerVisible }));
          } else {
            toolManager.setActiveTool("rectangle");
          }
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
        case "p":
          toolManager.setActiveTool("pen");
          break;
        case "t":
          toolManager.setActiveTool("text");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;
}
