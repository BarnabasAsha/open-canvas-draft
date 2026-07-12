import type { SceneGraph } from "../types/scene";
import { createStore } from "./createStore";

const emptyScene: SceneGraph = { nodes: {}, rootIds: [] };

export const sceneStore = createStore<SceneGraph>(emptyScene);
