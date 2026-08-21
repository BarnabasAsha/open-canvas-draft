import { useSyncExternalStore } from "react";
import { canvasSizeStore } from "./canvasSizeStore";

export function useCanvasSize() {
  return useSyncExternalStore(canvasSizeStore.subscribe, canvasSizeStore.getState);
}
