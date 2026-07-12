import type { NodeId } from "../types/scene";
import { createStore } from "./createStore";

export interface SelectionState {
  selectedIds: Set<NodeId>;
  hoveredId: NodeId | null;
}

const initialSelection: SelectionState = { selectedIds: new Set(), hoveredId: null };

export const selectionStore = createStore<SelectionState>(initialSelection);
