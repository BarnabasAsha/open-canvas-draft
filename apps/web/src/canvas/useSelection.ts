import { useSyncExternalStore } from "react";
import { selectionStore } from "../store/selectionStore";

export function useSelection() {
  return useSyncExternalStore(selectionStore.subscribe, selectionStore.getState);
}
