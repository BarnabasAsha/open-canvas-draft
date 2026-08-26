import { useSyncExternalStore } from "react";
import { flexInsertionStore } from "./tools/flexInsertionStore";

export function useFlexInsertion() {
  return useSyncExternalStore(flexInsertionStore.subscribe, flexInsertionStore.getState);
}
