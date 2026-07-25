# Frame presets walkthrough

The Frame tool now opens a submenu instead of just activating — "Custom" (the original drag-to-draw behavior, unchanged) followed by a flat, categorized list of real device sizes. Picking one places a frame at that exact size immediately, centered in whatever's currently in view.

## Why a flat list, not nested categories

The natural reading of "Desktop / Mobile / iPad, then specific ones for each" is a tree — a Desktop submenu, inside which sit its specific sizes, and so on. Base UI's `Menu.SubmenuRoot`/`Menu.SubmenuTrigger` genuinely support that nesting. It was built and then deliberately flattened: three levels deep (Structure → Frame → Desktop → "MacBook Pro 14″") is a lot of hovering to place one frame, and it doesn't match how Figma's own frame picker actually reads — a single scrollable list with plain section labels, not further submenus. `framePresets.ts`'s data shape still has categories (`FramePresetCategory[]`), but `StructureMenu.tsx` renders them as one flat list with a `.menu-group-label` heading per category rather than a nested trigger, which is both less code and fewer clicks.

## "Custom" lives inside the same submenu as the presets

Frame is the only structural tool with more than one way to create it, which is what actually justifies giving it a submenu at all (Section stays a plain click-to-select item, unchanged). Base UI's `SubmenuTrigger` only opens a submenu — it can't also directly select a tool the way a plain `Menu.Item` does — so "drag one out by hand" had to become a genuine first row *inside* that submenu ("Custom") rather than living on the trigger itself:

```tsx
<Menu.SubmenuTrigger className="menu-item shape-menu-item" ...>
  <FrameCornersIcon size={16} />
</Menu.SubmenuTrigger>
<Menu.Portal>
  <Menu.Positioner side="bottom" align="start" ...>
    <Menu.Popup className="menu-popup frame-preset-popup">
      <Menu.Item onClick={() => onSelectTool("frame")}>Custom</Menu.Item>
      {FRAME_PRESET_CATEGORIES.map((category) => (...))}
```

## One frame-building function, two ways to arrive at x/y/width/height

`frameTool.ts` used to build its `FrameNode` literal inline, inside the object passed to `createDragToCreateTool`. That got pulled out into a standalone `buildFrameNode(id, name, x, y, width, height)` — the exact same node shape, just parameterized instead of embedded — because placing a preset needs to build an identical node from a fixed size rather than two dragged corners:

```ts
export const frameTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current) => {
    const { x, y, width, height } = rectFromPoints(start, current);
    return buildFrameNode(id, "Frame", x, y, width, height);
  },
});
```

The drag tool still gets its numbered default name ("Frame 1", "Frame 2"...) exactly as before — that numbering happens one layer up, in `dragToCreateTool.ts`'s shared `onPointerDown`, which was never touched. A placed preset goes through the same `nextDefaultName` call directly (so two placed iPads become "iPad 1"/"iPad 2"), but seeded with the preset's own descriptive name instead of the generic "Frame" — deliberately, since "iPhone 12 1" in the layers panel is more useful than "Frame 3" would be.

## Placement: centered on whatever's actually in view

`placeFramePreset` (in `App.tsx`, alongside the app's other orchestration functions) anchors the new frame at the center of the *currently visible* canvas, not a fixed scene coordinate — the same `screenToScene({x: width/2, y: height/2}, viewport)` pattern the keyboard zoom shortcuts already use to find "the middle of what's on screen right now" regardless of how far the canvas has been panned:

```ts
const sceneCenter = screenToScene({ x: canvasWidth / 2, y: canvasHeight / 2 }, viewportStore.getState());
const node = buildFrameNode(generateId(), nextDefaultName(graph, preset.name),
  sceneCenter.x - preset.width / 2, sceneCenter.y - preset.height / 2,
  preset.width, preset.height);
```

Committed through the same `createAddNodeCommand` + `historyManager.execute` every other creation path uses, selection switches to the new frame, and the active tool switches back to Select — matching every other creation tool's end-of-gesture behavior exactly, even though there was no gesture here at all, just a menu click.

## Verified

Opened the Frame submenu, confirmed all three categories and nine presets render with correct dimensions, placed "iPhone 12" and checked the result numerically: frame width/height matched the preset exactly (390×844), position matched the hand-computed center-anchored formula exactly (given the test's canvas size and default viewport, `x = 185, y = -72` — confirmed both against the actual rendered X/Y fields), name became "iPhone 12 1", the Select tool activated automatically, and undo removed the placed frame cleanly. No console errors.

## What's deliberately out of scope for this pass

- **Not exhaustive** — nine presets across three categories (Desktop/MacBook 14″/16″, iPad/iPad Pro 11″/12.9″, iPhone 12/14 Pro Max/SE). Easy to extend later by adding entries to `FRAME_PRESET_CATEGORIES`; no reason to front-load every device that exists.
- **Android/other platforms** — only Apple devices, matching what was actually asked for.
- **A search/filter box** for the preset list — reasonable once the list grows much longer than one scroll's worth; not needed at nine entries.
