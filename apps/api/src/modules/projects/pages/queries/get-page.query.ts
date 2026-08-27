import { BaseQuery } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import type { PageModel } from "../domain/page.model";
import { loadOwnedPage } from "../load-owned-page";
import type { PageRepository } from "../repositories/page.repository";

export interface GetPageInput {
  pageId: string;
}

export class GetPageQuery extends BaseQuery<GetPageInput, PageModel> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: GetPageInput): Promise<PageModel> {
    const userId = requireUserId(this.requestContext);
    return loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);
  }
}
