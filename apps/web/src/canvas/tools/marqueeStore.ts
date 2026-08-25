import { createStore } from "../../store/createStore";
import type { Point } from "../../utils/coordinates";

export interface MarqueeState {
  start: Point;
  current: Point;
}

// Ephemeral drag-in-progress UI state, not scene data — mirrors
// textEditStore's role as the bridge between a plain-module tool
// (selectTool.ts isn't a React component) and the overlay that renders it.
export const marqueeStore = createStore<MarqueeState | null>(null);
