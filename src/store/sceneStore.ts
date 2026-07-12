import type { SceneGraph } from "../types/scene";

type Listener = () => void;

const emptyScene: SceneGraph = { nodes: {}, rootIds: [] };

class SceneStore {
  private state: SceneGraph;
  private listeners = new Set<Listener>();

  constructor(initialState: SceneGraph) {
    this.state = initialState;
  }

  getState(): SceneGraph {
    return this.state;
  }

  update(fn: (state: SceneGraph) => SceneGraph): void {
    this.state = fn(this.state);
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const sceneStore = new SceneStore(emptyScene);
