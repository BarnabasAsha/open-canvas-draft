import { BaseQuery } from "../../../../../core";
import { requireUserId, type RequestContext } from "../../../../../lib/request-context";
import type { ProjectRepository } from "../../../repositories/project.repository";
import { loadOwnedPage } from "../../load-owned-page";
import type { PageRepository } from "../../repositories/page.repository";
import type { PageEventModel } from "../domain/page-event.model";
import type { PageEventRepository } from "../repositories/page-event.repository";

export interface ListPageEventsInput {
  pageId: string;
}

export class ListPageEventsQuery extends BaseQuery<ListPageEventsInput, PageEventModel[]> {
  private readonly pageEventRepository: PageEventRepository;
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(
    pageEventRepository: PageEventRepository,
    pageRepository: PageRepository,
    projectRepository: ProjectRepository,
    requestContext: RequestContext,
  ) {
    super();
    this.pageEventRepository = pageEventRepository;
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: ListPageEventsInput): Promise<PageEventModel[]> {
    const userId = requireUserId(this.requestContext);
    const page = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);
    return this.pageEventRepository.findAllByPage(page.id);
  }
}
