import { SceneGraphSchema, type SceneGraph } from "@open-canvas/schema";
import { AttributeBag, Mapper } from "../../../../core";
import type { PageRow } from "../../../../db/schema";
import { PageModel } from "../domain/page.model";

export class PageMapper extends Mapper<PageModel, PageRow> {
  toDomain(row: PageRow): PageModel {
    // Validated against the SAME schema the frontend uses to build a
    // scene graph in the first place — @open-canvas/schema is the one
    // source of truth for what's valid, on both sides. The cast is a
    // deliberate boundary crossing, not a hole in validation: Zod infers
    // `semantics.tag` as a raw `string`, narrower than the hand-refined
    // `SceneGraph` type (`keyof HTMLElementTagNameMap`) the schema
    // package exports — the exact same gap `documents.ts` (the route
    // this module replaces) already worked around the same way.
    const sceneGraph = SceneGraphSchema.parse(row.sceneGraph) as SceneGraph;
    return PageModel.reconstitute(
      {
        projectId: row.projectId,
        name: row.name,
        sceneGraph,
        attributes: AttributeBag.from((row.attributes as Record<string, unknown>) ?? {}),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }

  toPersistence(domain: PageModel): PageRow {
    return {
      id: domain.id,
      projectId: domain.projectId,
      name: domain.name,
      sceneGraph: domain.sceneGraph,
      attributes: domain.attributes.toPlain(),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
