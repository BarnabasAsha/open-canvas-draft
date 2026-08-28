import { DomainModel } from "../../../../../core";

export type PageEventKind = "execute" | "undo" | "redo";

export interface PageEventProps {
  pageId: string;
  kind: PageEventKind;
  event: Record<string, unknown> | null;
  createdAt: Date;
}

// Immutable — an event log row is never updated once written, only
// created (and read). No rename()-style mutation methods, unlike every
// other domain model in this codebase.
export class PageEventModel extends DomainModel<PageEventProps> {
  get pageId(): string {
    return this._props.pageId;
  }

  get kind(): PageEventKind {
    return this._props.kind;
  }

  get event(): Record<string, unknown> | null {
    return this._props.event;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  static create(input: { id: string; pageId: string; kind: PageEventKind; event: Record<string, unknown> | null }): PageEventModel {
    return new PageEventModel({ pageId: input.pageId, kind: input.kind, event: input.event, createdAt: new Date() }, input.id);
  }

  static reconstitute(props: PageEventProps, id: string): PageEventModel {
    return new PageEventModel(props, id);
  }
}
