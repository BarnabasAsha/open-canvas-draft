import type { SceneGraph } from "@open-canvas/schema";
import { BaseCommand, type CommandResult, ok } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import type { PageModel } from "../domain/page.model";
import { loadOwnedPage } from "../load-owned-page";
import type { PageRepository } from "../repositories/page.repository";

export interface UpdatePageSceneInput {
  pageId: string;
  sceneGraph: SceneGraph;
}

// A separate endpoint/command from rename — scene saves are the hot
// path (frequent, potentially large writes), distinct from occasional
// metadata edits, and keeping them separate means a scene autosave never
// needs to send/validate a `name` field it isn't touching.
export class UpdatePageSceneCommand extends BaseCommand<UpdatePageSceneInput, PageModel> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: UpdatePageSceneInput): Promise<CommandResult<PageModel>> {
    const userId = requireUserId(this.requestContext);
    const existing = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);

    const updated = existing.updateScene(input.sceneGraph);
    await this.pageRepository.save(updated);
    return ok(updated);
  }
}
