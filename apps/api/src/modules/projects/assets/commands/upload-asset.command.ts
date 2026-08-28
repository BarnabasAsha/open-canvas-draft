import { v7 as uuidv7 } from "uuid";
import { BaseCommand, type CommandResult, NotFoundError, ok } from "../../../../core";
import { getR2PublicUrl, type R2Client } from "../../../../lib/r2-client";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import { AssetModel } from "../domain/asset.model";
import type { AssetRepository } from "../repositories/asset.repository";

export interface UploadAssetInput {
  projectId: string;
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

function extensionFor(fileName: string, mimeType: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(fileName);
  if (match) return match[0];
  const subtype = mimeType.split("/")[1];
  return subtype ? `.${subtype}` : "";
}

export class UploadAssetCommand extends BaseCommand<UploadAssetInput, AssetModel> {
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

  async execute(input: UploadAssetInput): Promise<CommandResult<AssetModel>> {
    const userId = requireUserId(this.requestContext);
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) throw new NotFoundError("Project not found");
    project.assertOwnedBy(userId);

    // Checked before the upload's real side effect happens — throwing only
    // afterward would leave an orphaned object in the bucket with nothing
    // in Postgres ever referencing it.
    const publicUrl = getR2PublicUrl();

    const id = uuidv7();
    const key = `${input.projectId}/${id}${extensionFor(input.fileName, input.mimeType)}`;
    await this.r2Client.putObject({ key, body: input.buffer, contentType: input.mimeType });

    const asset = AssetModel.create({
      id,
      projectId: input.projectId,
      key,
      url: `${publicUrl}/${key}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
    });
    await this.assetRepository.save(asset);
    return ok(asset);
  }
}
