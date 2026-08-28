import { BaseCommand, type CommandResult, NotFoundError, ok } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import type { ProjectRepository } from "../repositories/project.repository";

export interface DeleteProjectInput {
  projectId: string;
}

export class DeleteProjectCommand extends BaseCommand<DeleteProjectInput, void> {
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: DeleteProjectInput): Promise<CommandResult<void>> {
    const userId = requireUserId(this.requestContext);
    const existing = await this.projectRepository.findById(input.projectId);
    if (!existing) throw new NotFoundError("Project not found");
    existing.assertOwnedBy(userId);

    // Pages cascade at the DB level (pages.project_id has onDelete:
    // "cascade") — no separate PageRepository call needed here.
    await this.projectRepository.delete(input.projectId);
    return ok(undefined);
  }
}
