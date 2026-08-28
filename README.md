# Open Canvas (draft)

An AI-native design tool — think Figma/Canva-class canvas editing, usable fully by hand or (eventually) driven by an AI chat layer. This repo is the canvas half: a hand-built TypeScript/Canvas2D design-tool engine, built to see how far real design-tool editing (shapes, layout, text, layers, selection, transforms, history) can go before reaching for something like Rust/WASM for rendering.

It's also a learning project. The `docs/` folder has a short "walkthrough" write-up for most features — what was built, the trade-offs, and the bugs found along the way — rather than just a changelog.

## Current state

The canvas stands on its own — no AI, no export yet (see [What's not here yet](#whats-not-here-yet)) — but it's no longer a local-only demo: signing in, your projects, and everything you draw are real and persisted.

**Accounts & projects** — Google sign-in (Better Auth), a dashboard listing your projects, and a create-project flow. Every new signup automatically gets an example project (a small hero-section demo scene) so there's something real to open immediately, instead of an empty list.

**Persistence** — Each project's pages autosave to the backend (debounced, per page) as you edit — refreshing or coming back later picks up exactly where you left off. Pages can be added, renamed, and deleted, all backed by the API.

**Assets** — Images are uploaded to Cloudflare R2 (not inlined as base64) and tracked per project, with a small asset library (upload/insert/delete) in the canvas's left rail.

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

**Edit history log** — Every command (add/move/resize/delete/group/…) now also carries a serializable description of itself and is logged per page (`packages/commands`'s `SceneEvent`/`replaySceneEvents`, a `page_events` table). This is groundwork, not a shipped feature yet — see below.

## What's not here yet

Deliberately deferred until the canvas itself is fully solid, per the project's own stated phasing:

- **Export** (HTML now, React later) — not started. The CSS-generation groundwork exists (see the CSS inspector above), but there's no whole-document export yet.
- **AI / chat-driven editing** — not started.
- **Icon library** — icons are planned to decompose into native path nodes (not raster images), not yet built.
- **Editable semantic tags** — every node already carries a semantic tag/role in its data (currently read-only in the UI); this becomes editable once export is built and actually consumes it.
- **Version history UI / undo-depth gating for paid plans** — the event log above captures and persists the data this would need, but there's no UI to browse or restore from it, and no plan-tier/billing system yet to gate it by. Live undo/redo (Cmd+Z) stays exactly as fast and fully client-local as it's always been — this is about a future *read-only* history browser, not live editing.

## Tech stack

- **Frontend**: Vite + React 19 + TypeScript, rendered on Canvas2D (no canvas library)
- **UI primitives**: [Base UI](https://base-ui.com) (headless), styled entirely by hand
- **Icons**: [Phosphor Icons](https://phosphoricons.com)
- **Validation/schema**: [Zod](https://zod.dev)
- **Linting**: ESLint (flat config) + oxlint
- **Package manager**: pnpm workspaces

**Backend** — [Hono](https://hono.dev), [Drizzle](https://orm.drizzle.team) + Postgres, [Better Auth](https://www.better-auth.com) (Google sign-in), and [Cloudflare R2](https://developers.cloudflare.com/r2/) for asset storage — all in place and wired into the web app today, following a small DDD-ish pattern (domain model → mapper → repository → command/query → route) per resource (Projects, Pages, Assets, page-events).

## Project structure

```
apps/
  web/        the canvas app itself (Vite + React) — auth, dashboard,
              and the canvas editor, all backed by real API calls
  api/        Hono + Drizzle/Postgres backend: auth (Better Auth),
              projects, pages (with autosave + a per-page event log),
              and R2-backed asset uploads
packages/
  schema/     Zod schemas + inferred types for every scene-graph node type
  commands/   pure, DOM-free graph logic — layout, mutations, undo/redo
              commands, serializable SceneEvents + replay, CSS generation
              — shared by (and testable outside) the web app (see
              packages/commands/README.md)
docs/         one write-up per shipped feature: design decisions, code
              walkthrough, bugs found and fixed
```

## Getting started

**Prerequisites**: Node 20+, [pnpm](https://pnpm.io) 10 (`corepack enable` will pick up the pinned version automatically, or install manually — `npm i -g pnpm`), and a local Postgres database.

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the env templates and fill them in:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```
   `apps/api/.env` needs a real `DATABASE_URL`, a `BETTER_AUTH_SECRET`, Google OAuth credentials (sign-in only works with these set — Google is currently the only auth method), and Cloudflare R2 credentials (asset uploads and the signup-time example project both need these). `apps/web/.env` just needs `VITE_API_URL` pointed at the API.
3. Push the schema to your database:
   ```bash
   pnpm --filter api db:push
   ```
4. Run both apps (from the repo root, in separate terminals):
   ```bash
   pnpm dev:api      # the backend API on :5005
   pnpm dev:web      # the canvas app on :5173
   ```

Open the URL Vite prints (defaults to `http://localhost:5173`) and sign in with Google — you'll land in a dashboard with an auto-provisioned example project ready to open.

Other useful commands, run from the repo root:

```bash
pnpm build        # build every package/app
pnpm typecheck    # typecheck every package/app
pnpm lint         # eslint across the whole repo
```

Each app can also be run from its own directory (`apps/web`, `apps/api`) with the same script names.

## License

[MIT](./LICENSE)
