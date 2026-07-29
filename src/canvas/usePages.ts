import { useSyncExternalStore } from "react";
import { pagesStore } from "../store/pagesStore";

export function usePages() {
  return useSyncExternalStore(pagesStore.subscribe, pagesStore.getState);
}
