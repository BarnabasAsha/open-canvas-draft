import { eq } from "drizzle-orm";
import { BaseRepository } from "../../../core";
import type { Database } from "../../../db/client";
import { projects } from "../../../db/schema";
import { ProjectMapper } from "../mappers/project.mapper";
import type { ProjectModel } from "../domain/project.model";

// The interface every consumer (commands, queries) depends on — never the
// concrete Drizzle class. Only ever selects Project's own columns, never
// joins Pages (see the "Aggregate boundary" note in the plan) — checking
// project ownership must never hydrate every page's scene graph.
export interface ProjectRepository {
  findById(id: string): Promise<ProjectModel | null>;
  findAllByOwner(ownerId: string): Promise<ProjectModel[]>;
  save(project: ProjectModel): Promise<void>;
  delete(id: string): Promise<void>;
}

export class DrizzleProjectRepository extends BaseRepository<ProjectModel, typeof projects.$inferSelect> implements ProjectRepository {
  private readonly db: Database;

  constructor(db: Database) {
    super(new ProjectMapper());
    this.db = db;
  }

  async findById(id: string): Promise<ProjectModel | null> {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async findAllByOwner(ownerId: string): Promise<ProjectModel[]> {
    const rows = await this.db.select().from(projects).where(eq(projects.ownerId, ownerId));
    return this.toDomainList(rows);
  }

  async save(project: ProjectModel): Promise<void> {
    const row = this.toPersistence(project);
    await this.db
      .insert(projects)
      .values(row)
      .onConflictDoUpdate({
        target: projects.id,
        set: { name: row.name, attributes: row.attributes, updatedAt: row.updatedAt },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }
}
