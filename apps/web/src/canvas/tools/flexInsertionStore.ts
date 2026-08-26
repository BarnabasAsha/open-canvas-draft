import { createStore } from "../../store/createStore";
import type { FlexInsertionResult } from "./flexInsertion";

// Ephemeral drag-in-progress UI state, not scene data — same role as
// marqueeStore.ts: the bridge between selectTool.ts (a plain module, not a
// React component) and the overlay that renders the current insertion line.
export const flexInsertionStore = createStore<FlexInsertionResult | null>(null);
