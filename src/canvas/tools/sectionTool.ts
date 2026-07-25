import type { SectionNode } from "../../types/scene";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const sectionTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): SectionNode => ({
    id,
    type: "section",
    name: "Section",
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    children: [],
  }),
});
