import type { AsyncSpec, Module, SpecMap } from "@inferdi/inferdi";
import type { Database } from "../../../db/client";
import type { RequestContext } from "../../../lib/request-context";
import type { ProjectRepository } from "../repositories/project.repository";
import { CreatePageCommand } from "./commands/create-page.command";
import { DeletePageCommand } from "./commands/delete-page.command";
import { RenamePageCommand } from "./commands/rename-page.command";
import { UpdatePageSceneCommand } from "./commands/update-page-scene.command";
import { GetPageQuery } from "./queries/get-page.query";
import { ListPagesQuery } from "./queries/list-pages.query";
import { DrizzlePageRepository, type PageRepository } from "./repositories/page.repository";

// Depends on `projectRepository` too (every Page command/query verifies
// ownership through its parent Project — see load-owned-page.ts), so
// container.ts must `.use(projectsModule)` before `.use(pagesModule)`.
type PagesRequirements = SpecMap<{ db: Database; projectRepository: ProjectRepository }> & {
  requestContext: AsyncSpec<RequestContext, "scoped">;
};

type PagesProvides = SpecMap<{ pageRepository: PageRepository }, "singleton"> &
  SpecMap<
    {
      createPageCommand: CreatePageCommand;
      renamePageCommand: RenamePageCommand;
      updatePageSceneCommand: UpdatePageSceneCommand;
      deletePageCommand: DeletePageCommand;
      listPagesQuery: ListPagesQuery;
      getPageQuery: GetPageQuery;
    },
    "transient"
  >;

export const pagesModule: Module<PagesRequirements, PagesProvides> = (c) =>
  c
    .registerFactory<"pageRepository", PageRepository>("pageRepository", (ctx) => new DrizzlePageRepository(ctx.get("db")))
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
    .registerClass("getPageQuery", GetPageQuery, ["pageRepository", "projectRepository", "requestContext"], "transient");
