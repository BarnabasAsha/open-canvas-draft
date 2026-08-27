import { Container } from "@inferdi/inferdi";
import { auth } from "../lib/auth";
import { db } from "../db/client";
import { logger } from "../lib/logger";
import type { RequestContext } from "../lib/request-context";
import { CreateProjectCommand } from "../modules/projects/commands/create-project.command";
import { DeleteProjectCommand } from "../modules/projects/commands/delete-project.command";
import { RenameProjectCommand } from "../modules/projects/commands/rename-project.command";
import { GetProjectQuery } from "../modules/projects/queries/get-project.query";
import { ListProjectsQuery } from "../modules/projects/queries/list-projects.query";
import { DrizzleProjectRepository, type ProjectRepository } from "../modules/projects/repositories/project.repository";
import { CreatePageCommand } from "../modules/projects/pages/commands/create-page.command";
import { DeletePageCommand } from "../modules/projects/pages/commands/delete-page.command";
import { RenamePageCommand } from "../modules/projects/pages/commands/rename-page.command";
import { UpdatePageSceneCommand } from "../modules/projects/pages/commands/update-page-scene.command";
import { GetPageQuery } from "../modules/projects/pages/queries/get-page.query";
import { ListPagesQuery } from "../modules/projects/pages/queries/list-pages.query";
import { DrizzlePageRepository, type PageRepository } from "../modules/projects/pages/repositories/page.repository";
import type { ScopeInput } from "./request-scope";

// `db` (`postgres` npm package / postgres.js) connects lazily on first
// query — no explicit "await pool ready" step needed, so it's a plain
// value, not an async factory. `requestContext` is the one genuinely
// async registration (calls auth.api.getSession, a DB round trip) — see
// its own comment below for why it's registered lazily rather than
// eagerly inside the Hono middleware's createScope.
export function buildRootContainer() {
  return new Container()
    .registerValue("db", db)
    .registerValue("logger", logger)
    .declareScopeInputs<{ request: ScopeInput }>()
    // Lazy: only actually resolves (and pays the session-lookup DB round
    // trip) when something downstream asks for it — requireAuth
    // middleware, or a Command/Query that depends on it. Routes that
    // never touch auth (e.g. /health) never trigger this at all.
    .registerAsyncFactory(
      "requestContext",
      async (request: ScopeInput): Promise<RequestContext> => {
        const result = await auth.api.getSession({ headers: request.headers });
        return { requestId: request.requestId, userId: result?.user.id ?? null, session: result };
      },
      ["request"],
      "scoped",
    )
    .registerFactory<"projectRepository", ProjectRepository>("projectRepository", (c) => new DrizzleProjectRepository(c.get("db")))
    .registerFactory<"pageRepository", PageRepository>("pageRepository", (c) => new DrizzlePageRepository(c.get("db")))
    .registerClass("createProjectCommand", CreateProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("renameProjectCommand", RenameProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("deleteProjectCommand", DeleteProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("listProjectsQuery", ListProjectsQuery, ["projectRepository", "requestContext"], "transient")
    .registerClass("getProjectQuery", GetProjectQuery, ["projectRepository", "requestContext"], "transient")
    .registerClass(
      "createPageCommand",
      CreatePageCommand,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "renamePageCommand",
      RenamePageCommand,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "updatePageSceneCommand",
      UpdatePageSceneCommand,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "deletePageCommand",
      DeletePageCommand,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "listPagesQuery",
      ListPagesQuery,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "getPageQuery",
      GetPageQuery,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    );
}

export type RootContainer = ReturnType<typeof buildRootContainer>;

export function createRequestScope(root: RootContainer, request: ScopeInput) {
  return root.createScope({ request });
}

export type RequestContainer = ReturnType<typeof createRequestScope>;
