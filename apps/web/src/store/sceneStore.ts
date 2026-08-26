import { createActivePageFacade } from "./activePageFacade";
import { getActivePage } from "./pagesStore";
import type { SceneStore } from "./createSceneStore";

// A thin facade over whichever page is currently active — every file that
// already imports sceneStore keeps working completely unchanged, since this
// still satisfies the exact same SceneStore shape; only where the state
// actually lives changed (per-page instead of one global instance). See
// activePageFacade.ts and pagesStore.ts for the real implementation.
export const sceneStore: SceneStore = {
  ...createActivePageFacade(() => getActivePage().scene),
  addNode: (node) => getActivePage().scene.addNode(node),
  removeNode: (nodeId) => getActivePage().scene.removeNode(nodeId),
  reparentNode: (nodeId, newParentId) => getActivePage().scene.reparentNode(nodeId, newParentId),
  reorderNode: (nodeId, newParentId, index) => getActivePage().scene.reorderNode(nodeId, newParentId, index),
};
