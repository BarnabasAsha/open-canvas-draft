import type { SceneGraph } from "@open-canvas/schema";
import type { SceneEvent } from "../events";

export interface Command {
  apply(graph: SceneGraph): SceneGraph;
  invert(graph: SceneGraph): SceneGraph;
  // A serializable description of what this command does — see events.ts.
  // Lets a HistoryManager log/persist edits without needing to know
  // anything about any individual command's internals.
  event: SceneEvent;
}
