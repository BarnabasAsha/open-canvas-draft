import { useSyncExternalStore } from "react";
import { saveStatusStore } from "./saveStatusStore";

export function useSaveStatus() {
  return useSyncExternalStore(saveStatusStore.subscribe, saveStatusStore.getState);
}
