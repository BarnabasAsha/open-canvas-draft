// Identity-based equality — two entities are the same iff their ids match,
// regardless of what their props currently hold. Every domain model in
// this app extends DomainModel (below), which extends this.
export abstract class Entity<Props> {
  protected readonly _id: string;
  protected readonly _props: Props;

  constructor(props: Props, id: string) {
    this._id = id;
    this._props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other: Entity<Props> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
