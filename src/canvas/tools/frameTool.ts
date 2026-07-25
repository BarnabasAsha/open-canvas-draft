import type { FrameNode } from "../../types/scene";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const frameTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): FrameNode => ({
    id,
    type: "frame",
    name: "Frame",
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    fill: "#ffffff",
    clipsContent: true,
    cornerRadius: 0,
    children: [],
  }),
});
