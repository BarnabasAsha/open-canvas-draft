import { BaseQuery, NotFoundError } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import type { AssetModel } from "../domain/asset.model";
import type { AssetRepository } from "../repositories/asset.repository";

export interface ListAssetsInput {
  projectId: string;
}

export class ListAssetsQuery extends BaseQuery<ListAssetsInput, AssetModel[]> {
  private readonly assetRepository: AssetRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(assetRepository: AssetRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.assetRepository = assetRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: ListAssetsInput): Promise<AssetModel[]> {
    const userId = requireUserId(this.requestContext);
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError("Project not found");
    project.assertOwnedBy(userId);

    return this.assetRepository.findAllByProject(input.projectId);
  }
}
