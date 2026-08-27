import type { SceneGraph } from "@open-canvas/schema";
import { AttributeBag, DomainModel } from "../../../../core";

export interface PageProps {
  projectId: string;
  name: string;
  sceneGraph: SceneGraph;
  attributes: AttributeBag;
  createdAt: Date;
  updatedAt: Date;
}

export class PageModel extends DomainModel<PageProps> {
  get projectId(): string {
    return this._props.projectId;
  }

  get name(): string {
    return this._props.name;
  }

  get sceneGraph(): SceneGraph {
    return this._props.sceneGraph;
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

  static create(input: { id: string; projectId: string; name: string; sceneGraph: SceneGraph }): PageModel {
    const now = new Date();
    return new PageModel(
      {
        projectId: input.projectId,
        name: input.name,
        sceneGraph: input.sceneGraph,
        attributes: AttributeBag.empty(),
        createdAt: now,
        updatedAt: now,
      },
      input.id,
    );
  }

  static reconstitute(props: PageProps, id: string): PageModel {
    return new PageModel(props, id);
  }

  rename(name: string): PageModel {
    this.assertState(name.trim().length > 0, "Page name cannot be empty");
    return new PageModel({ ...this._props, name, updatedAt: new Date() }, this._id);
  }

  updateScene(sceneGraph: SceneGraph): PageModel {
    return new PageModel({ ...this._props, sceneGraph, updatedAt: new Date() }, this._id);
  }
}
