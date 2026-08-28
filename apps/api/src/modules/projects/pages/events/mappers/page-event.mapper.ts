import { Mapper } from "../../../../../core";
import type { PageEventRow } from "../../../../../db/schema";
import { PageEventModel, type PageEventKind } from "../domain/page-event.model";

export class PageEventMapper extends Mapper<PageEventModel, PageEventRow> {
  toDomain(row: PageEventRow): PageEventModel {
    return PageEventModel.reconstitute(
      {
        pageId: row.pageId,
        kind: row.kind as PageEventKind,
        event: row.event as Record<string, unknown> | null,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  toPersistence(domain: PageEventModel): PageEventRow {
    return {
      id: domain.id,
      pageId: domain.pageId,
      kind: domain.kind,
      event: domain.event,
      createdAt: domain.createdAt,
    };
  }
}
