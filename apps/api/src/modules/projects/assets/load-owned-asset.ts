import { NotFoundError } from "../../../core";
import type { ProjectRepository } from "../repositories/project.repository";
import type { AssetModel } from "./domain/asset.model";
import type { AssetRepository } from "./repositories/asset.repository";

// Mirrors load-owned-page.ts — Asset has no ownerId of its own, only
// projectId, so ownership always resolves through the parent Project.
export async function loadOwnedAsset(
  assetRepository: AssetRepository,
  projectRepository: ProjectRepository,
  assetId: string,
  userId: string,
): Promise<AssetModel> {
  const asset = await assetRepository.findById(assetId);
  if (!asset) throw new NotFoundError("Asset not found");

  const project = await projectRepository.findById(asset.projectId);
  if (!project) throw new NotFoundError("Asset not found");
  project.assertOwnedBy(userId);

  return asset;
}
