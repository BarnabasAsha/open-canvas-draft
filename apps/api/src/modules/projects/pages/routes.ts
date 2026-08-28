import { SceneGraphSchema, type SceneGraph } from "@open-canvas/schema";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.middleware";
import type { RequestContainer } from "../../../di/container";
import type { PageModel } from "./domain/page.model";

type Env = InferdiHonoScopeEnv<RequestContainer>;

const createPageSchema = z.object({ name: z.string().min(1), sceneGraph: SceneGraphSchema });
const renamePageSchema = z.object({ name: z.string().min(1) });
const updateSceneSchema = z.object({ sceneGraph: SceneGraphSchema });

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
      projectId: c.req.param("projectId") as string,
      name: body.name,
      sceneGraph: body.sceneGraph as SceneGraph,
    });
    return c.json(serializePage(data), 201);
  })
  .get("/", async (c) => {
    const query = await c.var.di.getAsync("listPagesQuery");
    const pages = await query.execute({ projectId: c.req.param("projectId") as string });
    return c.json(pages.map(serializePage));
  })
  .get("/:pageId", async (c) => {
    const query = await c.var.di.getAsync("getPageQuery");
    const page = await query.execute({ pageId: c.req.param("pageId") });
    return c.json(serializePage(page));
  })
  .patch("/:pageId", zValidator("json", renamePageSchema), async (c) => {
    const command = await c.var.di.getAsync("renamePageCommand");
    const { data } = await command.execute({ pageId: c.req.param("pageId"), ...c.req.valid("json") });
    return c.json(serializePage(data));
  })
  // Separate from PATCH (metadata) — the hot path for frequent, potentially
  // large scene-graph saves, see UpdatePageSceneCommand's own comment.
  .put("/:pageId/scene", zValidator("json", updateSceneSchema), async (c) => {
    const command = await c.var.di.getAsync("updatePageSceneCommand");
    const body = c.req.valid("json");
    const { data } = await command.execute({
      pageId: c.req.param("pageId"),
      sceneGraph: body.sceneGraph as SceneGraph,
    });
    return c.json(serializePage(data));
  })
  .delete("/:pageId", async (c) => {
    const command = await c.var.di.getAsync("deletePageCommand");
    await command.execute({ pageId: c.req.param("pageId") });
    return c.body(null, 204);
  });
