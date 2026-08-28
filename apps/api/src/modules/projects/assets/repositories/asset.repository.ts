import { eq } from "drizzle-orm";
import { BaseRepository } from "../../../../core";
import type { Database } from "../../../../db/client";
import { assets } from "../../../../db/schema";
import { AssetMapper } from "../mappers/asset.mapper";
import type { AssetModel } from "../domain/asset.model";

// Never selects/joins `projects` — an Asset's ownership is resolved by
// loading its parent Project separately (see load-owned-asset.ts), same
// aggregate-boundary shape as PageRepository.
export interface AssetRepository {
  findById(id: string): Promise<AssetModel | null>;
  findAllByProject(projectId: string): Promise<AssetModel[]>;
  save(asset: AssetModel): Promise<void>;
  delete(id: string): Promise<void>;
}

export class DrizzleAssetRepository
  extends BaseRepository<AssetModel, typeof assets.$inferSelect>
  implements AssetRepository
{
  private readonly db: Database;

  constructor(db: Database) {
    super(new AssetMapper());
    this.db = db;
  }

  async findById(id: string): Promise<AssetModel | null> {
    const rows = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async findAllByProject(projectId: string): Promise<AssetModel[]> {
    const rows = await this.db.select().from(assets).where(eq(assets.projectId, projectId));
    return this.toDomainList(rows);
  }

  async save(asset: AssetModel): Promise<void> {
    const row = this.toPersistence(asset);
    await this.db.insert(assets).values(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(assets).where(eq(assets.id, id));
  }
}
