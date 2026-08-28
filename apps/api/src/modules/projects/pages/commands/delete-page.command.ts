import { BaseCommand, type CommandResult, ok } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import { loadOwnedPage } from "../load-owned-page";
import type { PageRepository } from "../repositories/page.repository";

export interface DeletePageInput {
  pageId: string;
}

export class DeletePageCommand extends BaseCommand<DeletePageInput, void> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: DeletePageInput): Promise<CommandResult<void>> {
    const userId = requireUserId(this.requestContext);
    const existing = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);

    await this.pageRepository.delete(existing.id);
    return ok(undefined);
  }
}
