import { v7 as uuidv7 } from "uuid";
import { BaseCommand, type CommandResult, ok } from "../../../../../core";
import { requireUserId, type RequestContext } from "../../../../../lib/request-context";
import type { ProjectRepository } from "../../../repositories/project.repository";
import { loadOwnedPage } from "../../load-owned-page";
import type { PageRepository } from "../../repositories/page.repository";
import { PageEventModel, type PageEventKind } from "../domain/page-event.model";
import type { PageEventRepository } from "../repositories/page-event.repository";

export interface AppendPageEventsInput {
  pageId: string;
  entries: { kind: PageEventKind; event?: Record<string, unknown> }[];
}

export class AppendPageEventsCommand extends BaseCommand<AppendPageEventsInput, void> {
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

  async execute(input: AppendPageEventsInput): Promise<CommandResult<void>> {
    const userId = requireUserId(this.requestContext);
    const page = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);

    const models = input.entries.map((entry) =>
      PageEventModel.create({ id: uuidv7(), pageId: page.id, kind: entry.kind, event: entry.event ?? null }),
    );
    await this.pageEventRepository.saveMany(models);
    return ok(undefined);
  }
}
