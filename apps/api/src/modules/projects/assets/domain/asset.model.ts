import { AttributeBag, DomainModel } from "../../../../core";

export interface AssetProps {
  projectId: string;
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  attributes: AttributeBag;
  createdAt: Date;
  updatedAt: Date;
}

// Immutable once uploaded — no rename/update method, only create and
// delete (the delete is a repository operation, not a domain transition,
// same as how a Page's delete works).
export class AssetModel extends DomainModel<AssetProps> {
  get projectId(): string {
    return this._props.projectId;
  }

  get key(): string {
    return this._props.key;
  }

  get url(): string {
    return this._props.url;
  }

  get fileName(): string {
    return this._props.fileName;
  }

  get mimeType(): string {
    return this._props.mimeType;
  }

  get size(): number {
    return this._props.size;
  }

  get attributes(): AttributeBag {
    return this._props.attributes;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date {
    return this._props.updatedAt;
  }

  static create(input: {
    id: string;
    projectId: string;
    key: string;
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
  }): AssetModel {
    const now = new Date();
    return new AssetModel(
      {
        projectId: input.projectId,
        key: input.key,
        url: input.url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
        attributes: AttributeBag.empty(),
        createdAt: now,
        updatedAt: now,
      },
      input.id,
    );
  }

  static reconstitute(props: AssetProps, id: string): AssetModel {
    return new AssetModel(props, id);
  }
}
