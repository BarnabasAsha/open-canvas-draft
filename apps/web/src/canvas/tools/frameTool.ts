import { buildFrameNode } from "./buildFrameNode";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const frameTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current) => {
    const { x, y, width, height } = rectFromPoints(start, current);
    return buildFrameNode(id, "Frame", x, y, width, height);
  },
});
