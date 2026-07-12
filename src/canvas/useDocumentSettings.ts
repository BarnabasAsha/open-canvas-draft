import { useSyncExternalStore } from "react";
import { documentStore } from "../store/documentStore";

export function useDocumentSettings() {
  return useSyncExternalStore(documentStore.subscribe, documentStore.getState);
}
