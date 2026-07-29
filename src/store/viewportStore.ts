import { createActivePageFacade } from "./activePageFacade";
import { getActivePage } from "./pagesStore";

// Thin facade over whichever page is active — see sceneStore.ts's comment
// for why this preserves every existing import site unchanged. Note:
// INITIAL_VIEWPORT now lives in utils/coordinates.ts, not here — this module
// used to export it directly, but it's needed by pagesStore.ts (to seed each
// new page's viewport) which this module itself now depends on, and keeping
// it here would make that a circular import.
export const viewportStore = createActivePageFacade(() => getActivePage().viewport);
