import { useSyncExternalStore } from "react";
import { toolManager } from "./tools/toolManager";

export function useActiveTool() {
  return useSyncExternalStore(toolManager.subscribe, toolManager.getState);
}
