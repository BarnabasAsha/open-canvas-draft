// A deliberate escape hatch from strict typed modeling — for genuinely
// speculative or non-load-bearing metadata that doesn't yet justify a
// migration (share-link visibility, template tags, a starred flag, UI
// preferences). Known, load-bearing fields (name, ownerId, sceneGraph)
// always stay real typed columns with real domain invariants; this is
// not a substitute for modeling something properly once it's clearly a
// first-class concept.
export class AttributeBag {
  private readonly _data: Record<string, unknown>;

  constructor(data: Record<string, unknown> = {}) {
    this._data = { ...data };
  }

  get<T>(key: string): T | undefined {
    return this._data[key] as T | undefined;
  }

  set(key: string, value: unknown): AttributeBag {
    return new AttributeBag({ ...this._data, [key]: value });
  }

  remove(key: string): AttributeBag {
    const next = { ...this._data };
    delete next[key];
    return new AttributeBag(next);
  }

  has(key: string): boolean {
    return key in this._data;
  }

  toPlain(): Record<string, unknown> {
    return { ...this._data };
  }

  static empty(): AttributeBag {
    return new AttributeBag({});
  }

  static from(data: Record<string, unknown>): AttributeBag {
    return new AttributeBag(data);
  }
}
