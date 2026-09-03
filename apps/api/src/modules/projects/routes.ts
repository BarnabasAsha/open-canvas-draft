import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireUuidParam } from "../../lib/require-uuid-param";
import type { RequestContainer } from "../../di/container";
import { pageRoutes } from "./pages/routes";
import { assetRoutes } from "./assets/routes";
import type { ProjectModel } from "./domain/project.model";

type Env = InferdiHonoScopeEnv<RequestContainer>;

const createProjectSchema = z.object({ name: z.string().min(1), description: z.string().max(500).optional() });
const renameProjectSchema = z.object({ name: z.string().min(1) });

// `attributes` is a speculative internal metadata bag (see AttributeBag's
// own comment) — never exposed wholesale. If a specific attribute is
// ever safe/useful for a client to see, pick that one key explicitly
// here rather than serializing the whole bag by default.
function serializeProject(project: ProjectModel) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export const projectRoutes = new Hono<Env>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createProjectSchema), async (c) => {
    const command = await c.var.di.getAsync("createProjectCommand");
    const { data } = await command.execute(c.req.valid("json"));
    return c.json(serializeProject(data), 201);
  })
  .get("/", async (c) => {
    const query = await c.var.di.getAsync("listProjectsQuery");
    const projects = await query.execute();
    return c.json(projects.map(serializeProject));
  })
  .get("/:projectId", async (c) => {
    const query = await c.var.di.getAsync("getProjectQuery");
    const project = await query.execute({ projectId: requireUuidParam(c.req.param("projectId"), "projectId") });
    return c.json(serializeProject(project));
  })
  .patch("/:projectId", zValidator("json", renameProjectSchema), async (c) => {
    const command = await c.var.di.getAsync("renameProjectCommand");
    const { data } = await command.execute({
      projectId: requireUuidParam(c.req.param("projectId"), "projectId"),
      ...c.req.valid("json"),
    });
    return c.json(serializeProject(data));
  })
  .delete("/:projectId", async (c) => {
    const command = await c.var.di.getAsync("deleteProjectCommand");
    await command.execute({ projectId: requireUuidParam(c.req.param("projectId"), "projectId") });
    return c.body(null, 204);
  })
  .post("/:projectId/duplicate", async (c) => {
    const command = await c.var.di.getAsync("duplicateProjectCommand");
    const { data } = await command.execute({ projectId: requireUuidParam(c.req.param("projectId"), "projectId") });
    return c.json(serializeProject(data), 201);
  })
  .route("/:projectId/pages", pageRoutes)
  .route("/:projectId/assets", assetRoutes);
