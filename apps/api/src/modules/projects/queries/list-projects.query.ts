import { BaseQuery } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import type { ProjectModel } from "../domain/project.model";
import type { ProjectRepository } from "../repositories/project.repository";

export class ListProjectsQuery extends BaseQuery<void, ProjectModel[]> {
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(): Promise<ProjectModel[]> {
    const userId = requireUserId(this.requestContext);
    return this.projectRepository.findAllByOwner(userId);
  }
}
