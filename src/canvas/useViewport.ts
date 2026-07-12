import { useSyncExternalStore } from "react";
import { viewportStore } from "../store/viewportStore";

export function useViewport() {
  return useSyncExternalStore(viewportStore.subscribe, viewportStore.getState);
}
