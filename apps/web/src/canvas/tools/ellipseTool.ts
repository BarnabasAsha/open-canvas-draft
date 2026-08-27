import type { EllipseNode } from "@open-canvas/schema";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const ellipseTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): EllipseNode => ({
    id,
    type: "ellipse",
    name: "Ellipse",
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    fill: "#d9d9d9",
    stroke: null,
    strokeWidth: 0,
    strokeStyle: "solid",
  }),
});
