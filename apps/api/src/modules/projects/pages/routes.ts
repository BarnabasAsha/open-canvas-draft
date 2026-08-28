import { SceneGraphSchema, type SceneGraph } from "@open-canvas/schema";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.middleware";
import { requireUuidParam } from "../../../lib/require-uuid-param";
import type { RequestContainer } from "../../../di/container";
import type { PageModel } from "./domain/page.model";
import type { PageEventModel } from "./events/domain/page-event.model";

type Env = InferdiHonoScopeEnv<RequestContainer>;

const createPageSchema = z.object({ name: z.string().min(1), sceneGraph: SceneGraphSchema });
const renamePageSchema = z.object({ name: z.string().min(1) });
const updateSceneSchema = z.object({ sceneGraph: SceneGraphSchema });

// `event`'s internal shape (SceneEvent, from @open-canvas/commands) isn't
// re-validated here — this endpoint treats it as an opaque JSON blob to
// store and hand back verbatim, the same way `attributes` bags are never
// deeply inspected server-side. Nothing server-side interprets event
// contents yet (no replay endpoint, no gating logic — see the plan's
// explicitly-out-of-scope list), so a loose shape is the honest one.
// `entries` is capped well above the frontend's own flush threshold (20,
// see pageEventLog.ts) — generous headroom for a legitimate batch, but not
// unbounded.
const appendPageEventsSchema = z.object({
  entries: z
    .array(z.object({ kind: z.enum(["execute", "undo", "redo"]), event: z.record(z.string(), z.unknown()).optional() }))
    .min(1)
    .max(100),
});

const APPEND_EVENTS_BODY_LIMIT_BYTES = 1 * 1024 * 1024;

// `attributes` is a speculative internal metadata bag (see AttributeBag's
// own comment) — never exposed wholesale. If a specific attribute is
// ever safe/useful for a client to see, pick that one key explicitly
// here rather than serializing the whole bag by default.
function serializePage(page: PageModel) {
  return {
    id: page.id,
    projectId: page.projectId,
    name: page.name,
    sceneGraph: page.sceneGraph,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

function serializePageEvent(pageEvent: PageEventModel) {
  return {
    id: pageEvent.id,
    pageId: pageEvent.pageId,
    kind: pageEvent.kind,
    event: pageEvent.event,
    createdAt: pageEvent.createdAt.toISOString(),
  };
}

// Mounted at /projects/:projectId/pages by the parent router (Hono's
// .route() composition shares the parent's path params, so
// c.req.param("projectId") works here too) — see the "Aggregate
// boundary" note in the plan for why this nests for URL discoverability
// while Page stays a fully separate repository/aggregate underneath.
//
// Two casts recur below, both boundary crossings, not correctness holes:
// - `c.req.param("projectId") as string` — this sub-app never itself
//   declares a route containing `:projectId` (only the parent does), so
//   Hono's own type inference can't statically know it's always present
//   here, even though at runtime it always is.
// - `... as SceneGraph` on a validated `sceneGraph` body — Zod infers
//   `semantics.tag` as a raw `string`, narrower than the hand-refined
//   SceneGraph type this schema package exports (same gap PageMapper and
//   the old documents.ts route both already work around the same way).
export const pageRoutes = new Hono<Env>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createPageSchema), async (c) => {
    const command = await c.var.di.getAsync("createPageCommand");
    const body = c.req.valid("json");
    const { data } = await command.execute({
      projectId: requireUuidParam(c.req.param("projectId"), "projectId"),
      name: body.name,
      sceneGraph: body.sceneGraph as SceneGraph,
    });
    return c.json(serializePage(data), 201);
  })
  .get("/", async (c) => {
    const query = await c.var.di.getAsync("listPagesQuery");
    const pages = await query.execute({ projectId: requireUuidParam(c.req.param("projectId"), "projectId") });
    return c.json(pages.map(serializePage));
  })
  .get("/:pageId", async (c) => {
    const query = await c.var.di.getAsync("getPageQuery");
    const page = await query.execute({ pageId: requireUuidParam(c.req.param("pageId"), "pageId") });
    return c.json(serializePage(page));
  })
  .patch("/:pageId", zValidator("json", renamePageSchema), async (c) => {
    const command = await c.var.di.getAsync("renamePageCommand");
    const { data } = await command.execute({
      pageId: requireUuidParam(c.req.param("pageId"), "pageId"),
      ...c.req.valid("json"),
    });
    return c.json(serializePage(data));
  })
  // Separate from PATCH (metadata) — the hot path for frequent, potentially
  // large scene-graph saves, see UpdatePageSceneCommand's own comment.
  .put("/:pageId/scene", zValidator("json", updateSceneSchema), async (c) => {
    const command = await c.var.di.getAsync("updatePageSceneCommand");
    const body = c.req.valid("json");
    const { data } = await command.execute({
      pageId: requireUuidParam(c.req.param("pageId"), "pageId"),
      sceneGraph: body.sceneGraph as SceneGraph,
    });
    return c.json(serializePage(data));
  })
  .delete("/:pageId", async (c) => {
    const command = await c.var.di.getAsync("deletePageCommand");
    await command.execute({ pageId: requireUuidParam(c.req.param("pageId"), "pageId") });
    return c.body(null, 204);
  })
  .post(
    "/:pageId/events",
    bodyLimit({ maxSize: APPEND_EVENTS_BODY_LIMIT_BYTES, onError: (c) => c.json({ error: "Batch too large" }, 413) }),
    zValidator("json", appendPageEventsSchema),
    async (c) => {
      const command = await c.var.di.getAsync("appendPageEventsCommand");
      const body = c.req.valid("json");
      await command.execute({ pageId: requireUuidParam(c.req.param("pageId"), "pageId"), entries: body.entries });
      return c.body(null, 204);
    },
  )
  .get("/:pageId/events", async (c) => {
    const query = await c.var.di.getAsync("listPageEventsQuery");
    const events = await query.execute({ pageId: requireUuidParam(c.req.param("pageId"), "pageId") });
    return c.json(events.map(serializePageEvent));
  });
