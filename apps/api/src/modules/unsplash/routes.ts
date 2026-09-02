import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import type { RequestContainer } from "../../di/container";

type Env = InferdiHonoScopeEnv<RequestContainer>;

const trackDownloadSchema = z.object({ downloadLocation: z.string().url() });

// Flat module, not nested under /projects/:projectId — search and download
// tracking aren't project-scoped (see unsplash.module.ts).
export const unsplashRoutes = new Hono<Env>()
  .use("*", requireAuth)
  .get("/search", async (c) => {
    // No query — UnsplashTab's default view before a real search — falls
    // through to SearchPhotosQuery's own editorial-feed fallback.
    const query = c.req.query("query");
    const page = c.req.query("page");

    const searchPhotosQuery = await c.var.di.getAsync("searchPhotosQuery");
    const results = await searchPhotosQuery.execute({ query, page: page ? Number(page) : undefined });
    return c.json(results);
  })
  .post("/track-download", zValidator("json", trackDownloadSchema), async (c) => {
    const command = await c.var.di.getAsync("trackDownloadCommand");
    await command.execute(c.req.valid("json"));
    return c.body(null, 204);
  });
