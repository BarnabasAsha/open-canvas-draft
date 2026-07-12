import type { SceneGraph } from "../types/scene";

export interface Command {
  apply(graph: SceneGraph): SceneGraph;
  invert(graph: SceneGraph): SceneGraph;
}
