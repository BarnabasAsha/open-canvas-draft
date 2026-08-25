import type { SceneGraph } from "@open-canvas/schema";

export interface Command {
  apply(graph: SceneGraph): SceneGraph;
  invert(graph: SceneGraph): SceneGraph;
}
