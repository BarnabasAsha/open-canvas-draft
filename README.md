# Open Canvas (draft)

An AI-native design tool — think Figma/Canva-class canvas editing, usable fully by hand or (eventually) driven by an AI chat layer. This repo is the canvas half: a hand-built TypeScript/Canvas2D design-tool engine, built to see how far real design-tool editing (shapes, layout, text, layers, selection, transforms, history) can go before reaching for something like Rust/WASM for rendering.

It's also a learning project. The `docs/` folder has a short "walkthrough" write-up for most features — what was built, the trade-offs, and the bugs found along the way — rather than just a changelog.

## Current state

The canvas stands on its own — no AI, no export yet (see [What's not here yet](#whats-not-here-yet)).

The app always loads a seed scene (`apps/web/src/utils/seedData.ts`) — a small marketing-page mockup exercising most node types and the flex layout system — rather than starting blank. There's no persistence wired up yet (see the Backend note below), so this is also the *only* state: edits live in memory for the session and a refresh discards them and reloads the same seed scene.

**Shapes & drawing** — Rectangle, Ellipse, Line, Arrow, Text, Image, and a Pen tool for freeform bezier paths. Frame and Section as containers, plus a Group for ad-hoc bagging of a selection. Frame has device-size presets (Desktop, iPad, iPhone, etc.) alongside free drag-to-draw.

**Layout** — Opt-in flex layout per Frame/Section (`layoutMode: "none" | "flex"`, Figma-style "Auto layout"): direction, gap, padding, justify-content/align-items, and per-child fixed/hug/fill sizing on every node. Text nodes auto-resize (hug width and/or height) from their real rendered content, reconciled correctly even when a child's width comes from the flex container filling remaining space. Drag-to-reorder inside a flex container shows a live insertion indicator.

**Text** — Real Google Fonts loaded on demand, full styling (weight, style, letter-spacing, line-height, decoration, alignment, color), inline click-to-type editing with word-wrapping, and content-driven auto-resize.

**Images & effects** — Drag-drop/file-picker image placement with `object-fit`, and a CSS-filter Effects panel (blur, brightness, contrast, grayscale, saturate, sepia, hue-rotate) rendered live on canvas.

**Components** — Turn a selection into a reusable component definition; place instances of it; edit an instance's overrides without touching the shared definition.

**Organization** — A Figma-style Pages list (each with its own scene, history, selection, and viewport), a Layers panel with visibility/lock toggles and inline rename, and Group/Ungroup.

**Selection & editing** — Click, shift-click, and marquee selection; multi-select move/resize (including a persisted Group scaling all its members together); 6-way alignment (to each other, or a container's children to itself); shared batch-editing of style fields across a multi-select; keyboard shortcuts; full undo/redo.

**Right-click context menu** — On the canvas or in the Layers panel: Duplicate, Delete, Group, Ungroup, Create Component, Bring to Front, Send to Back.

**Inspection** — A read-only CSS panel on any selected node, generating real, copyable CSS from its current properties (including correct flex-child sizing translation).

**Canvas fundamentals** — Zoom/pan, rulers, a toggleable grid, and a properties panel with collapsible sections per node type.

## What's not here yet

Deliberately deferred until the canvas itself is fully solid, per the project's own stated phasing:

- **Export** (HTML now, React later) — not started. The CSS-generation groundwork exists (see the CSS inspector above), but there's no whole-document export yet.
- **AI / chat-driven editing** — not started.
- **Icon library** — icons are planned to decompose into native path nodes (not raster images), not yet built.
- **Editable semantic tags** — every node already carries a semantic tag/role in its data (currently read-only in the UI); this becomes editable once export is built and actually consumes it.
- **A real backend** — `apps/api` is a Hono skeleton backed by a single local JSON file, not wired into the web app's UI at all. Real persistence, auth, and file storage (Drizzle, Better Auth, Cloudflare R2 — see Tech stack below) haven't been built yet.

## Tech stack

- **Frontend**: Vite + React 19 + TypeScript, rendered on Canvas2D (no canvas library)
- **UI primitives**: [Base UI](https://base-ui.com) (headless), styled entirely by hand
- **Icons**: [Phosphor Icons](https://phosphoricons.com)
- **Validation/schema**: [Zod](https://zod.dev)
- **Linting**: ESLint (flat config) + oxlint
- **Package manager**: pnpm workspaces

**Backend** — [Hono](https://hono.dev) is the API framework, in place today. Everything else is intended but not built yet: `apps/api`'s document store is currently a single local JSON file, explicitly a placeholder (see the comment in `apps/api/src/documentStore.ts`) for:
- **[Drizzle](https://orm.drizzle.team)** as the ORM, replacing the JSON file with a real database.
- **[Better Auth](https://www.better-auth.com)** for authentication.
- **[Cloudflare R2](https://developers.cloudflare.com/r2/)** for asset/file storage (images, exports).

## Project structure

```
apps/
  web/        the canvas app itself (Vite + React)
  api/        a small Hono API for saving/loading documents, backed by a
              single local JSON file for now (Drizzle/Better Auth/R2 are
              the intended stack — see Tech stack below) — not yet wired
              into the web app's UI (no persistence flow calls it today)
packages/
  schema/     Zod schemas + inferred types for every scene-graph node type
  commands/   pure, DOM-free graph logic — layout, mutations, undo/redo
              commands, CSS generation — shared by (and testable outside)
              the web app (see packages/commands/README.md)
docs/         one write-up per shipped feature: design decisions, code
              walkthrough, bugs found and fixed
```

## Getting started

**Prerequisites**: Node 20+, and [pnpm](https://pnpm.io) 10 (`corepack enable` will pick up the pinned version automatically, or install manually — `npm i -g pnpm`).

```bash
pnpm install
pnpm dev:web
```

Open the URL Vite prints (defaults to `http://localhost:5173`) — the canvas loads with a seeded demo design.

Other useful commands, run from the repo root:

```bash
pnpm dev:api      # the backend API on :3001 (optional — see note above)
pnpm build        # build every package/app
pnpm typecheck    # typecheck every package/app
pnpm lint         # eslint across the whole repo
```

Each app can also be run from its own directory (`apps/web`, `apps/api`) with the same script names.
