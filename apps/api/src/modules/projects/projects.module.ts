import type { AsyncSpec, Module, SpecMap } from "@inferdi/inferdi";
import type { Database } from "../../db/client";
import type { RequestContext } from "../../lib/request-context";
import { CreateProjectCommand } from "./commands/create-project.command";
import { DeleteProjectCommand } from "./commands/delete-project.command";
import { RenameProjectCommand } from "./commands/rename-project.command";
import { GetProjectQuery } from "./queries/get-project.query";
import { ListProjectsQuery } from "./queries/list-projects.query";
import { DrizzleProjectRepository, type ProjectRepository } from "./repositories/project.repository";

// Everything the Projects module needs to already exist on the container
// before it can register itself — `db` (a plain synchronous value) and
// `requestContext` (scoped, async — see container.ts for why).
type ProjectsRequirements = SpecMap<{ db: Database }> & { requestContext: AsyncSpec<RequestContext, "scoped"> };

// What this module adds. Split across two SpecMap calls because
// `projectRepository` is a singleton while every command/query is
// transient — SpecMap applies one lifetime to every key it's given.
type ProjectsProvides = SpecMap<{ projectRepository: ProjectRepository }, "singleton"> &
  SpecMap<
    {
      createProjectCommand: CreateProjectCommand;
      renameProjectCommand: RenameProjectCommand;
      deleteProjectCommand: DeleteProjectCommand;
      listProjectsQuery: ListProjectsQuery;
      getProjectQuery: GetProjectQuery;
    },
    "transient"
  >;

// This module's own file is the ONE place the root container needs to
// touch when the Projects module's registrations change — adding a new
// Project command/query never requires editing di/container.ts.
export const projectsModule: Module<ProjectsRequirements, ProjectsProvides> = (c) =>
  c
    .registerFactory<"projectRepository", ProjectRepository>("projectRepository", (ctx) => new DrizzleProjectRepository(ctx.get("db")))
    .registerClass("createProjectCommand", CreateProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("renameProjectCommand", RenameProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("deleteProjectCommand", DeleteProjectCommand, ["projectRepository", "requestContext"], "transient")
    .registerClass("listProjectsQuery", ListProjectsQuery, ["projectRepository", "requestContext"], "transient")
    .registerClass("getProjectQuery", GetProjectQuery, ["projectRepository", "requestContext"], "transient");
