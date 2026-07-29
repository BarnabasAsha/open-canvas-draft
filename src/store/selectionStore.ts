import type { NodeId } from "../types/scene";
import { createActivePageFacade } from "./activePageFacade";
import { getActivePage } from "./pagesStore";

export interface SelectionState {
  selectedIds: Set<NodeId>;
  hoveredId: NodeId | null;
}

// Thin facade over whichever page is active — see sceneStore.ts's comment
// for why this preserves every existing import site unchanged.
export const selectionStore = createActivePageFacade(() => getActivePage().selection);
