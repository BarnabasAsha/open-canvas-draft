import { pagesStore } from "./pagesStore";
import type { Store } from "./createStore";

// sceneStore/selectionStore/viewportStore are each a thin facade built from
// this — every one of the many files that already import those singletons
// directly keeps working unchanged, because the facade still satisfies the
// exact same Store<T> shape; only where the state actually comes from
// changes (whichever page is currently active).
//
// The one thing a plain pass-through can't get for free: `subscribe` has to
// re-wire itself whenever the active page switches, not just when the
// current page's own data changes, and it has to fire immediately when that
// happens so useSyncExternalStore re-renders with the newly active page's
// state right away.
export function createActivePageFacade<T>(getActiveStore: () => Store<T>): Store<T> {
  return {
    getState: () => getActiveStore().getState(),
    update: (fn) => getActiveStore().update(fn),
    subscribe: (listener) => {
      let unsubscribeInner = getActiveStore().subscribe(listener);

      const unsubscribeOuter = pagesStore.subscribe(() => {
        unsubscribeInner();
        unsubscribeInner = getActiveStore().subscribe(listener);
        listener(); // the visible page just changed — notify immediately
      });

      return () => {
        unsubscribeInner();
        unsubscribeOuter();
      };
    },
  };
}
