import { BaseQuery, NotFoundError } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import type { PageModel } from "../domain/page.model";
import type { PageRepository } from "../repositories/page.repository";

export interface ListPagesInput {
  projectId: string;
}

export class ListPagesQuery extends BaseQuery<ListPagesInput, PageModel[]> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: ListPagesInput): Promise<PageModel[]> {
    const userId = requireUserId(this.requestContext);
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError("Project not found");
    project.assertOwnedBy(userId);

    return this.pageRepository.findAllByProject(input.projectId);
  }
}
