import { BaseCommand, type CommandResult, ok } from "../../../../core";
import type { R2Client } from "../../../../lib/r2-client";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import { loadOwnedAsset } from "../load-owned-asset";
import type { AssetRepository } from "../repositories/asset.repository";

export interface DeleteAssetInput {
  assetId: string;
}

export class DeleteAssetCommand extends BaseCommand<DeleteAssetInput, void> {
  private readonly assetRepository: AssetRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly r2Client: R2Client;
  private readonly requestContext: RequestContext;

  constructor(assetRepository: AssetRepository, projectRepository: ProjectRepository, r2Client: R2Client, requestContext: RequestContext) {
    super();
    this.assetRepository = assetRepository;
    this.projectRepository = projectRepository;
    this.r2Client = r2Client;
    this.requestContext = requestContext;
  }

  async execute(input: DeleteAssetInput): Promise<CommandResult<void>> {
    const userId = requireUserId(this.requestContext);
    const asset = await loadOwnedAsset(this.assetRepository, this.projectRepository, input.assetId, userId);

    await this.r2Client.deleteObject(asset.key);
    await this.assetRepository.delete(asset.id);
    return ok(undefined);
  }
}
