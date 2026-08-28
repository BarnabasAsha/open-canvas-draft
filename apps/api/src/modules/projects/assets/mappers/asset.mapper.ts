import { AttributeBag, Mapper } from "../../../../core";
import type { AssetRow } from "../../../../db/schema";
import { AssetModel } from "../domain/asset.model";

export class AssetMapper extends Mapper<AssetModel, AssetRow> {
  toDomain(row: AssetRow): AssetModel {
    return AssetModel.reconstitute(
      {
        projectId: row.projectId,
        key: row.key,
        url: row.url,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
        attributes: AttributeBag.from((row.attributes as Record<string, unknown>) ?? {}),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }

  toPersistence(domain: AssetModel): AssetRow {
    return {
      id: domain.id,
      projectId: domain.projectId,
      key: domain.key,
      url: domain.url,
      fileName: domain.fileName,
      mimeType: domain.mimeType,
      size: domain.size,
      attributes: domain.attributes.toPlain(),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
