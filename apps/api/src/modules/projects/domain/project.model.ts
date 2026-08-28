import { AttributeBag, DomainModel, NotFoundError } from "../../../core";

export interface ProjectProps {
  name: string;
  ownerId: string;
  attributes: AttributeBag;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectModel extends DomainModel<ProjectProps> {
  get name(): string {
    return this._props.name;
  }

  get ownerId(): string {
    return this._props.ownerId;
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

  static create(input: { id: string; name: string; ownerId: string }): ProjectModel {
    const now = new Date();
    return new ProjectModel(
      { name: input.name, ownerId: input.ownerId, attributes: AttributeBag.empty(), createdAt: now, updatedAt: now },
      input.id,
    );
  }

  static reconstitute(props: ProjectProps, id: string): ProjectModel {
    return new ProjectModel(props, id);
  }

  rename(name: string): ProjectModel {
    this.assertState(name.trim().length > 0, "Project name cannot be empty");
    return new ProjectModel({ ...this._props, name, updatedAt: new Date() }, this._id);
  }

  // The one shared ownership primitive every Project/Page command and
  // query calls — throws NotFoundError (not a generic DomainError) for
  // BOTH "doesn't exist" and "exists but isn't yours," collapsing both
  // to a 404 deliberately (see core/errors.ts).
  assertOwnedBy(userId: string): void {
    if (this._props.ownerId !== userId) {
      throw new NotFoundError("Project not found");
    }
  }
}
