import type { FrameNode } from "../../types/scene";
import { createDragToCreateTool } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const frameTool: Tool = createDragToCreateTool({
  buildNode: (id, x, y, width, height): FrameNode => ({
    id,
    type: "frame",
    name: "Frame",
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#ffffff",
    clipsContent: true,
    cornerRadius: 0,
    children: [],
  }),
});
