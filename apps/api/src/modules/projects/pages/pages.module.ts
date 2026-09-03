import type { AsyncSpec, Module, SpecMap } from "@inferdi/inferdi";
import type { Database } from "../../../db/client";
import type { RequestContext } from "../../../lib/request-context";
import type { ProjectRepository } from "../repositories/project.repository";
import { DuplicateProjectCommand } from "../commands/duplicate-project.command";
import { CreatePageCommand } from "./commands/create-page.command";
import { DeletePageCommand } from "./commands/delete-page.command";
import { RenamePageCommand } from "./commands/rename-page.command";
import { UpdatePageSceneCommand } from "./commands/update-page-scene.command";
import { AppendPageEventsCommand } from "./events/commands/append-page-events.command";
import { ListPageEventsQuery } from "./events/queries/list-page-events.query";
import { DrizzlePageEventRepository, type PageEventRepository } from "./events/repositories/page-event.repository";
import { ExportFrameHtmlQuery } from "./queries/export-frame-html.query";
import { GetPageQuery } from "./queries/get-page.query";
import { ListPagesQuery } from "./queries/list-pages.query";
import { DrizzlePageRepository, type PageRepository } from "./repositories/page.repository";

// Depends on `projectRepository` too (every Page command/query verifies
// ownership through its parent Project — see load-owned-page.ts), so
// container.ts must `.use(projectsModule)` before `.use(pagesModule)`.
type PagesRequirements = SpecMap<{ db: Database; projectRepository: ProjectRepository }> & {
  requestContext: AsyncSpec<RequestContext, "scoped">;
};

type PagesProvides = SpecMap<{ pageRepository: PageRepository; pageEventRepository: PageEventRepository }, "singleton"> &
  SpecMap<
    {
      createPageCommand: CreatePageCommand;
      renamePageCommand: RenamePageCommand;
      updatePageSceneCommand: UpdatePageSceneCommand;
      deletePageCommand: DeletePageCommand;
      listPagesQuery: ListPagesQuery;
      getPageQuery: GetPageQuery;
      appendPageEventsCommand: AppendPageEventsCommand;
      listPageEventsQuery: ListPageEventsQuery;
      exportFrameHtmlQuery: ExportFrameHtmlQuery;
      // Registered here, not in projects.module.ts, despite being a
      // project-level operation — it needs pageRepository too (copying a
      // project means copying its pages), and container.ts only composes
      // pagesModule after projectsModule, never the reverse.
      duplicateProjectCommand: DuplicateProjectCommand;
    },
    "transient"
  >;

export const pagesModule: Module<PagesRequirements, PagesProvides> = (c) =>
  c
    .registerFactory<"pageRepository", PageRepository>("pageRepository", (ctx) => new DrizzlePageRepository(ctx.get("db")))
    .registerFactory<"pageEventRepository", PageEventRepository>(
      "pageEventRepository",
      (ctx) => new DrizzlePageEventRepository(ctx.get("db")),
    )
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
    .registerClass("getPageQuery", GetPageQuery, ["pageRepository", "projectRepository", "requestContext"], "transient")
    .registerClass(
      "appendPageEventsCommand",
      AppendPageEventsCommand,
      ["pageEventRepository", "pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "listPageEventsQuery",
      ListPageEventsQuery,
      ["pageEventRepository", "pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "exportFrameHtmlQuery",
      ExportFrameHtmlQuery,
      ["pageRepository", "projectRepository", "requestContext"],
      "transient",
    )
    .registerClass(
      "duplicateProjectCommand",
      DuplicateProjectCommand,
      ["projectRepository", "pageRepository", "requestContext"],
      "transient",
    );
