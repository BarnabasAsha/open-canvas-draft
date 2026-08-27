import { eq } from "drizzle-orm";
import { BaseRepository } from "../../../../core";
import type { Database } from "../../../../db/client";
import { pages } from "../../../../db/schema";
import { PageMapper } from "../mappers/page.mapper";
import type { PageModel } from "../domain/page.model";

// Never selects/joins anything from `projects` — a Page's own ownership
// is resolved by loading its parent Project separately (see the
// "Aggregate boundary" note in the plan), so this repository stays
// entirely single-aggregate.
export interface PageRepository {
  findById(id: string): Promise<PageModel | null>;
  findAllByProject(projectId: string): Promise<PageModel[]>;
  save(page: PageModel): Promise<void>;
  delete(id: string): Promise<void>;
}

export class DrizzlePageRepository extends BaseRepository<PageModel, typeof pages.$inferSelect> implements PageRepository {
  private readonly db: Database;

  constructor(db: Database) {
    super(new PageMapper());
    this.db = db;
  }

  async findById(id: string): Promise<PageModel | null> {
    const rows = await this.db.select().from(pages).where(eq(pages.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async findAllByProject(projectId: string): Promise<PageModel[]> {
    const rows = await this.db.select().from(pages).where(eq(pages.projectId, projectId));
    return this.toDomainList(rows);
  }

  async save(page: PageModel): Promise<void> {
    const row = this.toPersistence(page);
    await this.db
      .insert(pages)
      .values(row)
      .onConflictDoUpdate({
        target: pages.id,
        set: { name: row.name, sceneGraph: row.sceneGraph, attributes: row.attributes, updatedAt: row.updatedAt },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(pages).where(eq(pages.id, id));
  }
}
