# Open Canvas (draft)

An AI-native design tool — think Figma/Canva-class canvas editing, usable fully by hand or driven by an AI chat layer. The canvas must stand on its own without AI before the chat and export layers are built.

## Project goal

Explore how far a hand-built TypeScript canvas engine can go — real design-tool editing (shapes, layout, text, layers, selection, transforms, history) — before reaching for Rust/WASM for rendering. AI (chat-driven editing) and export (HTML, later React) are deliberately deferred; they come after the canvas itself is solid. This is a learning project as much as a build: prefer explaining trade-offs over silently picking one.

Work happens in phases. Don't build ahead of the current phase — no scaffolding for AI or export until their phase arrives.

## Stack

Vite + React 19 + TypeScript, oxlint. No router, no state library, no canvas library yet — these get added deliberately, not by default, when a phase needs them.

**UI components:** [Base UI](https://base-ui.com) (`@base-ui/react`, the MUI/Radix team's headless component library) for interactive primitives — Toolbar, ToggleGroup, Menu, NumberField, Select, Checkbox, Collapsible, Tooltip. It ships zero visual style by design; we style every part ourselves (see `src/ui/theme.css`) rather than adopting Base UI's own look, so the design language stays ours. Reach for it whenever a UI need matches one of its primitives instead of hand-rolling the interaction/accessibility logic again.

**Icons:** [Phosphor Icons](https://phosphoricons.com) (`@phosphor-icons/react`). Import each icon by its `<Name>Icon` export (e.g. `CursorIcon`), not the deprecated unsuffixed alias. Only hand-draw a custom SVG icon when nothing in the set fits.

## Code philosophy

- **Clear names over comments.** A well-named function needs no explanation. If you feel the urge to write a comment, rename the thing instead.
- **Pure functions by default.** A function that takes inputs and returns outputs with no side effects is always preferable to one that reaches outside itself. Isolate side effects at the edges.
- **No premature abstraction.** Three similar lines of code is not a reason to build a hook or helper. Wait until the pattern is real and stable.
- **One job per file.** When a file starts doing more than one job, split it.
- **No unnecessary side effects.** Separate business logic from UI wherever possible.

## Component rules

### Presentational vs. container — strictly enforced

**Presentational components**
- Receive data via props, communicate via callbacks (`onX` props) only.
- No context reads, no router access, no direct API calls or `fetch`.
- No `useEffect`. Purely derived values via `useMemo` or inline expressions from props.
- Can have local UI state (`useState`) for things like hover, open/closed, controlled inputs — nothing that belongs to the rest of the app.

**Container components (pages)**
- Live in `src/pages/`, one per top-level view. Right now that's effectively a single editor view; don't introduce a router or multi-page structure until a phase actually needs a second view.
- Own the data: hold state (or read it from the store), pass it down to presentational children.
- Handle navigation and global state interactions.
- As thin as possible — delegate all rendering to children. A page component should read like a wiring diagram, not a template.

## Canvas architecture — cross-cutting rules

- **No node mutation outside the store.** Tools and UI call `sceneStore.update(...)` or go through `historyManager.execute(...)` — never mutate a node object pulled from `getState()` directly.
- **One file per tool, per shape-drawer, per sidebar section.** If a file is doing "hit-testing AND drawing AND state update" for a tool, split it — pointer-event logic, geometry math, and drawing should be separate, testable functions.
- **No `useEffect` for canvas drawing driven by re-renders.** Redraw is subscription-based: the canvas subscribes to store changes and redraws imperatively, not via React's render cycle.
- **Keep `BaseNode` fields uniform across types.** Resist adding one-off fields to individual node types when the property (e.g. opacity) could reasonably apply to all — this keeps the properties panel and command logic simpler.
