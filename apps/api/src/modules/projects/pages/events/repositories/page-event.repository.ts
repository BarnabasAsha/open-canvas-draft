import { asc, eq } from "drizzle-orm";
import { BaseRepository } from "../../../../../core";
import type { Database } from "../../../../../db/client";
import { pageEvents } from "../../../../../db/schema";
import { PageEventMapper } from "../mappers/page-event.mapper";
import type { PageEventModel } from "../domain/page-event.model";

export interface PageEventRepository {
  findAllByPage(pageId: string): Promise<PageEventModel[]>;
  saveMany(events: PageEventModel[]): Promise<void>;
}

export class DrizzlePageEventRepository
  extends BaseRepository<PageEventModel, typeof pageEvents.$inferSelect>
  implements PageEventRepository
{
  private readonly db: Database;

  constructor(db: Database) {
    super(new PageEventMapper());
    this.db = db;
  }

  async findAllByPage(pageId: string): Promise<PageEventModel[]> {
    const rows = await this.db.select().from(pageEvents).where(eq(pageEvents.pageId, pageId)).orderBy(asc(pageEvents.createdAt));
    return this.toDomainList(rows);
  }

  // First real multi-row insert in this codebase — every other repository
  // only ever writes one row at a time. A batch of logged history entries
  // arrives together from the client (see pageEventLog.ts), so this is a
  // genuine bulk append, not N single-row calls.
  async saveMany(events: PageEventModel[]): Promise<void> {
    if (events.length === 0) return;
    const rows = events.map((event) => this.toPersistence(event));
    await this.db.insert(pageEvents).values(rows);
  }
}
