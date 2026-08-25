import type { RectNode } from "@open-canvas/schema";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const rectangleTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): RectNode => ({
    id,
    type: "rect",
    name: "Rectangle",
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    fill: "#d9d9d9",
    stroke: null,
    strokeWidth: 0,
    strokeStyle: "solid",
    cornerRadius: 0,
  }),
});
