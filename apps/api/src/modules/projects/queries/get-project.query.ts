import { BaseQuery, NotFoundError } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import type { ProjectModel } from "../domain/project.model";
import type { ProjectRepository } from "../repositories/project.repository";

export interface GetProjectInput {
  projectId: string;
}

export class GetProjectQuery extends BaseQuery<GetProjectInput, ProjectModel> {
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: GetProjectInput): Promise<ProjectModel> {
    const userId = requireUserId(this.requestContext);
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError("Project not found");
    project.assertOwnedBy(userId);
    return project;
  }
}
