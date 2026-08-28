import type { SceneGraph } from "@open-canvas/schema";
import { applySceneEvent, invertSceneEvent, type SceneEvent } from "./events";

export type HistoryEntry = { kind: "execute"; event: SceneEvent } | { kind: "undo" } | { kind: "redo" };

const EMPTY_GRAPH: SceneGraph = { nodes: {}, rootIds: [] };

// Pure, stateless equivalent of createHistoryManager's live undo/redo-stack
// logic (apps/web/src/store/createHistoryManager.ts) — folds an ordered
// list of every execute/undo/redo call a page ever made into the resulting
// graph, starting from empty. No I/O: given the same entries, this always
// produces the same graph, which is what makes a persisted HistoryEntry log
// actually replayable.
export function replaySceneEvents(entries: readonly HistoryEntry[]): SceneGraph {
  let graph = EMPTY_GRAPH;
  const undoStack: SceneEvent[] = [];
  let redoStack: SceneEvent[] = [];

  for (const entry of entries) {
    if (entry.kind === "execute") {
      graph = applySceneEvent(graph, entry.event);
      undoStack.push(entry.event);
      redoStack = [];
    } else if (entry.kind === "undo") {
      const event = undoStack.pop();
      if (!event) continue;
      graph = invertSceneEvent(graph, event);
      redoStack.push(event);
    } else {
      const event = redoStack.pop();
      if (!event) continue;
      graph = applySceneEvent(graph, event);
      undoStack.push(event);
    }
  }

  return graph;
}
