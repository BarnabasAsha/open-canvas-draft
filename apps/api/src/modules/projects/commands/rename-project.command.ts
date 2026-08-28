import { BaseCommand, type CommandResult, NotFoundError, ok } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import { ProjectModel } from "../domain/project.model";
import type { ProjectRepository } from "../repositories/project.repository";

export interface RenameProjectInput {
  projectId: string;
  name: string;
}

export class RenameProjectCommand extends BaseCommand<RenameProjectInput, ProjectModel> {
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: RenameProjectInput): Promise<CommandResult<ProjectModel>> {
    const userId = requireUserId(this.requestContext);
    const existing = await this.projectRepository.findById(input.projectId);
    if (!existing) throw new NotFoundError("Project not found");
    existing.assertOwnedBy(userId);

    const renamed = existing.rename(input.name);
    await this.projectRepository.save(renamed);
    return ok(renamed);
  }
}
