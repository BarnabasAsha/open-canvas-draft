import { v7 as uuidv7 } from "uuid";
import { BaseCommand, type CommandResult, ok } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import { ProjectModel } from "../domain/project.model";
import type { ProjectRepository } from "../repositories/project.repository";

export interface CreateProjectInput {
  name: string;
  description?: string | null;
}

export class CreateProjectCommand extends BaseCommand<CreateProjectInput, ProjectModel> {
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: CreateProjectInput): Promise<CommandResult<ProjectModel>> {
    const ownerId = requireUserId(this.requestContext);
    const project = ProjectModel.create({ id: uuidv7(), name: input.name, ownerId, description: input.description });
    await this.projectRepository.save(project);
    return ok(project);
  }
}
