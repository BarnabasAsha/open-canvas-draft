# Phase 7 walkthrough

The text tool — click to place, type inline, double-click to re-edit — and two real browser-API gotchas that only showed up once this was actually driven in a browser, not read as code.

## The core trick, and why it's a trick at all

Canvas2D has no text cursor, no selection, no IME, no clipboard integration — reimplementing all of that by hand is a project in itself. The standard workaround (the brief names it directly): overlay a real, invisible-background `<textarea>` on top of the canvas at the text node's exact screen position while editing, and let the browser's own text-input machinery do the actual work. The canvas only ever has to *render the committed result*; the *editing experience itself* is just a normal DOM element.

That single idea touches four things: something has to track "which node is being edited" (`textEditStore`), something has to decide what a commit/cancel actually *means* for the scene graph (`textEdit.ts`), something has to position a DOM element exactly where a canvas node visually sits (`screenTransform.ts`), and the renderer has to stay honest with whatever a `<textarea>` can produce (multi-line `drawText.ts`).

## `textEditStore.ts` + `textEdit.ts` — state vs. orchestration

Same split this app already uses elsewhere (`sceneStore.ts` vs. `graphMutations.ts`, `selectionStore.ts` vs. the selection logic in `selectTool.ts`): the store is just data, `{nodeId, isNew, before}` or `null`; all the *decisions* live in `textEdit.ts`.

The `isNew` flag is the one piece of state that makes the commit logic correct. A node created by `textTool` has never been added to history — if you type something and click away, that has to become **one** `AddNodeCommand` capturing the final content, so a single `Cmd+Z` removes the whole thing. A node re-entered via double-click already exists in history — editing it needs a `SetNodeCommand(before, after)` instead, and only if the content actually changed (same no-op guard Phase 4 established for drags that never moved anything). Get this flag's handling wrong and undo either leaves an empty ghost node behind or fails to fully remove a freshly-typed one.

The node is also hidden (`visible: false`, applied the same non-undoable way a live drag preview works) the instant editing starts, and restored on the way out. Not doing this would mean the canvas renders the text *and* the textarea shows it *on top of that* — two overlapping copies. Selection is cleared for the same reason: resize handles floating around a text box you're actively typing into would be visual noise, not affordance.

## `commands/SetNodeCommand.ts` — a rename, not a new file

`ResizeNodeCommand` (from Phase 3) was already fully generic — "swap one node's value between two captured states" has nothing resize-specific in its actual implementation, only in its name. Text-edit commits need the exact same shape. Rather than create a second file with identical logic under a different name, `ResizeNodeCommand.ts` became `SetNodeCommand.ts`, and `selectTool.ts`'s resize-commit path moved onto the new name alongside `textEdit.ts`. One command, two callers, which is what should have been true from the moment a second real use case showed up.

## `drawText.ts` gets multi-line support

A native `<textarea>` lets you press Enter — that's not optional, it's just what textareas do. But `drawText.ts` was one `ctx.fillText(content, x, 0)` call, and `fillText` doesn't create line breaks for embedded `\n` characters; it just draws whatever's in the string, newline included, as visual garbage on one line. Once the editor could produce multi-line content, *not* handling it in the renderer would be a visible, easy-to-trigger bug (anyone pressing Enter while typing), not an edge case — so `drawText` now splits on `\n` and draws each line at an incremented y-offset. The line-height multiplier is exported and reused by the textarea's own CSS `line-height`, so the "invisible overlay" illusion holds up as well as browser font-metric quirks allow (canvas `fillText` and a real textarea never match pixel-for-pixel, but they're close).

## `screenTransform.ts` — position/rotation for a DOM element, not an SVG polygon

`SelectionOverlay` only ever needed a node's four *corner points* to draw an SVG outline. A `<textarea>` can't be handed four arbitrary corners — CSS positioning wants a top-left position and, separately, a rotation angle. `getScreenTransform` decomposes a node's world matrix (ancestors + its own rotation, then the viewport's pan/zoom) into exactly that: `matrix.transformPoint` for position, `Math.atan2(matrix.b, matrix.a)` for the angle. Same underlying `getWorldMatrix` every other piece of transform-aware code in this app already uses — just a different output shape for a different consumer.

## Two bugs that only a real browser run would catch

Both of these looked completely correct on read-through. Neither was.

### 1. The textarea appeared, then instantly vanished

First implementation called `.focus()` synchronously inside the mount effect. In the browser, the textarea would flash into existence for a frame and then disappear — `commitTextEdit` was firing with empty content almost immediately. The cause: the click that starts an edit session is still completing its own native event sequence (pointerdown → pointerup → mouseup → click) when React's effect runs. Focusing the textarea *during* that window wins the focus battle only long enough to lose it a moment later when the click finishes — the textarea gets blurred as a side effect of the very gesture that created it, and that blur commits (empty) content and tears the whole thing down before a human could ever see it.

Fix: defer the focus call one `requestAnimationFrame`. That's long enough for the triggering click to fully resolve before anything tries to grab focus.

### 2. Double-click detection never fired

The plan was to read `PointerEvent.detail` (1 for a single click, 2 for a double-click) off `onPointerDown`, the same way you'd read it off a `MouseEvent`. It came back `0` — always, for every click, single or double. This is a genuine, easy-to-not-know spec gotcha: `PointerEvent.detail` is *not* the same reliable click-counter that `MouseEvent.detail` is; pointer events largely don't carry click-count semantics at all.

Fix: stopped trying to infer double-clicks from pointer events entirely, and used the browser's own native `dblclick` event instead — which *is* correctly resolved by the browser's click-timing/distance heuristics. That required widening the `Tool` interface with an optional `onDoubleClick`, a new `toolManager.onDoubleClick` delegator, and a separate `onDoubleClick` handler on the canvas element (a plain `MouseEvent`, not a `PointerEvent`, hence `Canvas.tsx`'s `toToolEvent` needed a slightly more general parameter type to accept either).

## The keyboard-shortcut guard this phase forced

Every prior phase's `V`/`F`/`R`/`O`/`L`/`A` tool-switch shortcuts lived on a single global `window` `keydown` listener, which was fine — there was never anything on screen you'd actually be *typing into*. That stopped being true the moment a real `<textarea>` existed. Without a guard, pressing "r" while composing a sentence would also switch to the rectangle tool mid-word, and `Cmd+Z` would hijack the textarea's own native undo instead of behaving like a normal text field. `useKeyboardShortcuts.ts` now bails out immediately if `e.target` is a `TEXTAREA`/`INPUT`/`contentEditable` element — not a text-tool-specific fix, just a correctness fix that this phase's own new UI element made necessary.

## One UX call worth flagging: no select-all on re-focus

First pass called `.select()` right after `.focus()` when re-entering edit mode via double-click — reasonable instinct, since that's how many "quick edit" fields behave. In practice it meant: double-click existing text, start typing to add a word, and the very first keystroke wipes the entire previous content, because everything was pre-selected. That's a trap, not a convenience, for re-editing content you already wrote (as opposed to overwriting a fresh search box). Removed the `.select()` call — focus only, cursor lands at the start, and the now-visible native textarea still supports normal click-to-position-cursor or `Cmd+A` if the user actually wants to replace everything.

## What was tricky here, ranked

1. **The focus-then-instant-blur race.** Nothing about it is visible in the code — `commitTextEdit(value)` firing with an empty string looked like a logic bug in the commit-decision code for a while, when the actual cause was purely about *timing* relative to a native event sequence that had nothing to do with any of this app's own logic.
2. **`PointerEvent.detail` being unreliable.** This is the kind of thing you only learn by hitting it — the type system happily lets you read `.detail` off a `PointerEvent` (it's inherited from `UIEvent`), so nothing warns you it won't behave the way the identically-named property on `MouseEvent` does.
3. **Deciding what `isNew` needs to protect against.** Not hard to implement once named, but the failure mode if you get it wrong (an empty ghost node left in the scene, or a freshly-typed node that undo can't fully remove) is the kind of thing that's easy to not notice until you specifically try the "type nothing, click away" and "double-click, edit, then undo" paths.
