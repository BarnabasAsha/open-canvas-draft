import { v7 as uuidv7 } from "uuid";
import { BaseCommand, type CommandResult, NotFoundError, ok } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import { PageModel } from "../pages/domain/page.model";
import type { PageRepository } from "../pages/repositories/page.repository";
import { ProjectModel } from "../domain/project.model";
import type { ProjectRepository } from "../repositories/project.repository";

export interface DuplicateProjectInput {
  projectId: string;
}

// The one command that spans both aggregates (every other Project/Page
// command touches exactly one) — copying a project inherently means
// copying its pages too, so this needs both repositories rather than
// composing two separate commands: there's no natural "half-duplicated"
// state to leave a caller to clean up if this were split in two.
export class DuplicateProjectCommand extends BaseCommand<DuplicateProjectInput, ProjectModel> {
  private readonly projectRepository: ProjectRepository;
  private readonly pageRepository: PageRepository;
  private readonly requestContext: RequestContext;

  constructor(projectRepository: ProjectRepository, pageRepository: PageRepository, requestContext: RequestContext) {
    super();
    this.projectRepository = projectRepository;
    this.pageRepository = pageRepository;
    this.requestContext = requestContext;
  }

  async execute(input: DuplicateProjectInput): Promise<CommandResult<ProjectModel>> {
    const userId = requireUserId(this.requestContext);
    const source = await this.projectRepository.findById(input.projectId);
    if (!source) throw new NotFoundError("Project not found");
    source.assertOwnedBy(userId);

    const duplicate = ProjectModel.create({
      id: uuidv7(),
      name: `${source.name} copy`,
      ownerId: userId,
      description: source.description,
    });
    await this.projectRepository.save(duplicate);

    const sourcePages = await this.pageRepository.findAllByProject(input.projectId);
    for (const page of sourcePages) {
      const pageCopy = PageModel.create({
        id: uuidv7(),
        projectId: duplicate.id,
        name: page.name,
        sceneGraph: page.sceneGraph,
      });
      await this.pageRepository.save(pageCopy);
    }

    return ok(duplicate);
  }
}
