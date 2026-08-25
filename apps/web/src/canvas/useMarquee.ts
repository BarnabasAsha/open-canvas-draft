import { useSyncExternalStore } from "react";
import { marqueeStore } from "./tools/marqueeStore";

export function useMarquee() {
  return useSyncExternalStore(marqueeStore.subscribe, marqueeStore.getState);
}
