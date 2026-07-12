import type { SectionNode } from "../../types/scene";
import { createDragToCreateTool } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const sectionTool: Tool = createDragToCreateTool({
  buildNode: (id, x, y, width, height): SectionNode => ({
    id,
    type: "section",
    name: "Section",
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    label: "Section",
    children: [],
  }),
});
