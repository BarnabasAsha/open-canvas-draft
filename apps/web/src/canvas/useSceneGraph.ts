import { useSyncExternalStore } from "react";
import { sceneStore } from "../store/sceneStore";

export function useSceneGraph() {
  return useSyncExternalStore(sceneStore.subscribe, sceneStore.getState);
}
