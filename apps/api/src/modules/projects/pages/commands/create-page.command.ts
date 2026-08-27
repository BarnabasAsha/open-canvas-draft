import type { SceneGraph } from "@open-canvas/schema";
import { v7 as uuidv7 } from "uuid";
import { BaseCommand, type CommandResult, NotFoundError, ok } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import { PageModel } from "../domain/page.model";
import type { PageRepository } from "../repositories/page.repository";

export interface CreatePageInput {
  projectId: string;
  name: string;
  sceneGraph: SceneGraph;
}

export class CreatePageCommand extends BaseCommand<CreatePageInput, PageModel> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: CreatePageInput): Promise<CommandResult<PageModel>> {
    const userId = requireUserId(this.requestContext);
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError("Project not found");
    project.assertOwnedBy(userId);

    const page = PageModel.create({
      id: uuidv7(),
      projectId: input.projectId,
      name: input.name,
      sceneGraph: input.sceneGraph,
    });
    await this.pageRepository.save(page);
    return ok(page);
  }
}
