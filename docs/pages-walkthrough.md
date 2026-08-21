# Pages walkthrough

A Figma-style Pages list above Layers in the left sidebar — add a page, rename one inline, delete one, switch between them. Exactly one page is visible/editable at a time; there's no split-view. The interesting part isn't the sidebar UI, though — it's that the whole app used to assume exactly one scene existed, and this had to become "one *of several*" without rewriting the ~15 files that already assumed a single global scene.

## The problem: singletons, imported everywhere

Before this, `sceneStore`, `selectionStore`, `viewportStore`, and `historyManager` were each a plain module-level singleton — one `createStore(...)` call at the top of the file, exported directly. Shape tools (`selectTool.ts`, `penTool.ts`, `dragToCreateTool.ts` — shared by rect/ellipse/line/arrow/frame/section), `useKeyboardShortcuts.ts`, `App.tsx`'s orchestration functions, and the properties-panel edit hooks all import these directly at module scope and call `.getState()`/`.update()`/`.execute()` on them imperatively. Rewriting every one of those call sites to thread "which page" through explicitly would have been a sprawling, easy-to-get-wrong refactor for something that's really just "which page happens to be active right now."

## The fix: keep the singletons, make them facades

`createStore<T>` (`src/store/createStore.ts`) was never actually singleton by construction — it's a plain closure factory, `{ getState, update, subscribe }`, with nothing stopping you from calling it twice. The singleton-ness was entirely a property of how `sceneStore.ts` etc. happened to use it (call it once, export the one result). So each page gets its own real store instances, and the existing `sceneStore`/`selectionStore`/`viewportStore`/`historyManager` modules stop creating state themselves and instead delegate to "whichever page is active":

```ts
// src/store/sceneStore.ts, in full
export const sceneStore: SceneStore = {
  ...createActivePageFacade(() => getActivePage().scene),
  addNode: (node) => getActivePage().scene.addNode(node),
  removeNode: (nodeId) => getActivePage().scene.removeNode(nodeId),
  reparentNode: (nodeId, newParentId) => getActivePage().scene.reparentNode(nodeId, newParentId),
};
```

Every one of the ~15 consumer files needed **zero changes** — they still import `sceneStore` and call the exact same methods; only where the state actually lives changed underneath them.

The one real subtlety is `subscribe`. A facade's `getState`/`update` can just forward to whatever the active page's store currently is, but `subscribe` has to *re-wire itself* when the active page switches — not just relay the current page's own change events — and it has to fire immediately on switch so `useSyncExternalStore` re-renders with the newly active page's data right away:

```ts
// src/store/activePageFacade.ts
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
```

`selectionStore.ts` and `viewportStore.ts` are one-liners built directly on this. `historyManager.ts` doesn't need it at all — nothing subscribes to undo/redo state today (no visible undo/redo buttons, keyboard-only), so it's a plain pass-through:

```ts
export const historyManager = {
  execute: (command: Command) => getActivePage().history.execute(command),
  undo: () => getActivePage().history.undo(),
  redo: () => getActivePage().history.redo(),
};
```

## Giving every page its own real instances

`sceneStore.ts` and `historyManager.ts` used to *be* the implementation, not just a facade over one. That logic didn't disappear — it moved into two new factories so every page can get its own fully-featured copy the same way the old singleton was built:

- **`createSceneStore.ts`** — the exact previous body of `sceneStore.ts` (the `reconcileGroupBounds`-wrapped `update`, plus `addNode`/`removeNode`/`reparentNode`), now a function of an initial `SceneGraph` instead of a fixed empty-graph literal.
- **`createHistoryManager.ts`** — the exact previous body of `historyManager.ts`, now a function of *which scene store it commands against* instead of hard-importing one.

`pagesStore.ts` is what actually calls these, once per page:

```ts
function createPage(name: string, initialScene: SceneGraph): PageBundle {
  const scene = createSceneStore(initialScene);
  return {
    id: generateId(),
    name,
    scene,
    selection: createStore<SelectionState>({ selectedIds: new Set(), hoveredId: null }),
    viewport: createStore<Viewport>(INITIAL_VIEWPORT),
    history: createHistoryManager(scene),
  };
}
```

The file always starts with one page ("Page 1", seeded with the same hero-section demo content that used to load directly in `main.tsx`); every page added after that starts with an empty scene. Page naming reuses the same scan-for-next-number trick `nodeNaming.ts`'s `nextDefaultName` already used for node names (`nextPageName`, a small sibling in `utils/pageNaming.ts`) — no counter persisted anywhere, so deleting/renaming pages can't desync a stored counter from what's actually in the list.

`addPage`/`renamePage`/`deletePage`/`switchToPage` are plain functions exported alongside the store, following the same "store + its own action functions in one file" shape `sceneStore.ts` already established with `addNode`/`removeNode`. `deletePage` refuses to go below one page:

```ts
export function deletePage(id: PageId): void {
  pagesStore.update((state) => {
    if (state.pages.length <= 1) return state;
    const pages = state.pages.filter((page) => page.id !== id);
    const activePageId = state.activePageId === id ? pages[0].id : state.activePageId;
    return { pages, activePageId };
  });
}
```

## One avoided circular import

`pagesStore.ts` needs `INITIAL_VIEWPORT` to seed each new page's viewport, but `viewportStore.ts` (now a facade) needs `getActivePage` from `pagesStore.ts` — if `INITIAL_VIEWPORT` had stayed exported from `viewportStore.ts`, that's a genuine cycle. It moved to `src/utils/coordinates.ts` instead, where `Viewport` itself is already typed — a neutral, dependency-free home both modules can import from without looping back into each other.

## The UI: mirroring LayerItem's rename exactly

`PagesPanel.tsx`'s row interaction is a near copy-paste of `LayerItem.tsx`'s inline rename — same `editingName: string | null` local state (null = not editing), same commit-on-`Enter`/blur, cancel-on-`Escape`, discard-if-empty-after-trim logic, same `.layer-row-name-input` CSS class. It also reuses `.layer-row`, `.layer-row-name`, `.layer-row-actions`, and `.icon-button` directly rather than inventing near-duplicate classes — a page row and a layer row are different things, but "a name you can double-click to rename, with a hover-reveal action button" is exactly the same shape either way.

`LeftSidebar.tsx` is a new thin wrapper that took over the fixed `240px` bordered column `LayersPanel.tsx` used to own outright — `<PagesPanel />` sits above `<LayersPanel />` inside it, and `LayersPanel`'s own `Collapsible.Root` changed from `flex: "0 0 240px"` (owning the whole column) to `flex: 1` (filling whatever's left below Pages).

Delete has one small safety net beyond the "not asked for, kept simple" list below: since there's no persistence yet and a page delete can't be undone through the history system (page metadata isn't a `SceneGraph` node, so it doesn't fit the `Command` model), `PagesPanel` shows a native `confirm()` before deleting.

## Scope: what's per-page vs. global

Decided explicitly rather than assumed: scene graph, undo/redo history, selection, and pan/zoom are all per-page — switching pages swaps all four together, so leaving a page and coming back puts you exactly where you left it, selection included. Document-level settings (background color, grid/ruler visibility), the active tool, and the canvas's pixel size all stay global app preferences — switching pages doesn't reset your tool or grid setting, matching how those already read more like "how I like to work" than "what's on this page."

## Verified

Loaded the app fresh and confirmed the default page still shows the existing seed hero content with no regressions. Added a page (starts empty, becomes active immediately), drew a rectangle on it, switched to the original page and back — content stayed correctly isolated both directions, no leakage either way. Undo on the new page removed only its own rectangle; undoing again on the *other* page (which had no edits of its own) was a safe no-op that left its content untouched; redo brought the rectangle back. Selected the rectangle, switched away and back — still selected. Zoomed in on one page, switched away and back — zoom level restored exactly, confirmed against a separate page's own (different) zoom level. Rename: Enter commits, Escape cancels and reverts, an emptied name is discarded and the old name sticks. Delete: no delete icon at all with a single page, icon appears once a second page exists, a native confirm dialog gates the actual delete, and the correct page (not just "whichever" one) was removed with the survivor's own content verified intact. No console errors through any of it.

## What's deliberately out of scope for this pass

- **Page reordering (drag) and duplication** — real Figma features, not asked for; the data model doesn't need revisiting to add them later.
- **Per-page active tool** — the active tool stays global; switching pages keeps whatever tool you had selected.
- **Undo for page management itself** — add/rename/delete aren't undoable Commands, since page metadata doesn't fit the `SceneGraph`-shaped `Command` model; delete gets a confirm dialog instead as its safety net.
- **Local persistence** — the explicitly-planned next step after this, not bundled in here. The page bundles already hold plain, serializable-at-will state (each store's `getState()` is just data), so nothing here should need revisiting when that lands.
