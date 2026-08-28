import type { AsyncSpec, Module, SpecMap } from "@inferdi/inferdi";
import type { Database } from "../../../db/client";
import type { R2Client } from "../../../lib/r2-client";
import type { RequestContext } from "../../../lib/request-context";
import type { ProjectRepository } from "../repositories/project.repository";
import { DeleteAssetCommand } from "./commands/delete-asset.command";
import { UploadAssetCommand } from "./commands/upload-asset.command";
import { ListAssetsQuery } from "./queries/list-assets.query";
import { DrizzleAssetRepository, type AssetRepository } from "./repositories/asset.repository";

// Depends on `projectRepository` too (every Asset command/query verifies
// ownership through its parent Project — see load-owned-asset.ts), so
// container.ts must `.use(projectsModule)` before `.use(assetsModule)`.
type AssetsRequirements = SpecMap<{ db: Database; projectRepository: ProjectRepository; r2Client: R2Client }> & {
  requestContext: AsyncSpec<RequestContext, "scoped">;
};

type AssetsProvides = SpecMap<{ assetRepository: AssetRepository }, "singleton"> &
  SpecMap<
    {
      uploadAssetCommand: UploadAssetCommand;
      deleteAssetCommand: DeleteAssetCommand;
      listAssetsQuery: ListAssetsQuery;
    },
    "transient"
  >;

export const assetsModule: Module<AssetsRequirements, AssetsProvides> = (c) =>
  c
    .registerFactory<"assetRepository", AssetRepository>("assetRepository", (ctx) => new DrizzleAssetRepository(ctx.get("db")))
    .registerClass(
      "uploadAssetCommand",
      UploadAssetCommand,
      ["assetRepository", "projectRepository", "r2Client", "requestContext"],
      "transient",
    )
    .registerClass(
      "deleteAssetCommand",
      DeleteAssetCommand,
      ["assetRepository", "projectRepository", "r2Client", "requestContext"],
      "transient",
    )
    .registerClass(
      "listAssetsQuery",
      ListAssetsQuery,
      ["assetRepository", "projectRepository", "requestContext"],
      "transient",
    );
