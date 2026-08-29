import { AttributeBag, Mapper } from "../../../core";
import type { ProjectRow } from "../../../db/schema";
import { ProjectModel } from "../domain/project.model";

export class ProjectMapper extends Mapper<ProjectModel, ProjectRow> {
  toDomain(row: ProjectRow): ProjectModel {
    return ProjectModel.reconstitute(
      {
        name: row.name,
        description: row.description,
        ownerId: row.ownerId,
        attributes: AttributeBag.from((row.attributes as Record<string, unknown>) ?? {}),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }

  toPersistence(domain: ProjectModel): ProjectRow {
    return {
      id: domain.id,
      name: domain.name,
      description: domain.description,
      ownerId: domain.ownerId,
      attributes: domain.attributes.toPlain(),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
