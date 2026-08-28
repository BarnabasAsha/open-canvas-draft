import { useSyncExternalStore } from "react";
import { themeStore } from "./themeStore";

export function useTheme() {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getState);
}
