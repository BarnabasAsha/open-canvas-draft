import { BaseCommand, type CommandResult, ok } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import type { PageModel } from "../domain/page.model";
import { loadOwnedPage } from "../load-owned-page";
import type { PageRepository } from "../repositories/page.repository";

export interface RenamePageInput {
  pageId: string;
  name: string;
}

export class RenamePageCommand extends BaseCommand<RenamePageInput, PageModel> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: RenamePageInput): Promise<CommandResult<PageModel>> {
    const userId = requireUserId(this.requestContext);
    const existing = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);

    const renamed = existing.rename(input.name);
    await this.pageRepository.save(renamed);
    return ok(renamed);
  }
}
