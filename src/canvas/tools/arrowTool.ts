import type { ArrowNode } from "../../types/scene";
import { createDragToCreateTool, MIN_DRAW_SIZE } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const arrowTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): ArrowNode => ({
    id,
    type: "arrow",
    name: "Arrow",
    parentId: null,
    x: start.x,
    y: start.y,
    x2: current.x,
    y2: current.y,
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    stroke: "#111827",
    strokeWidth: 2,
    arrowheadSize: 10,
  }),
  // Same reasoning as lineTool: length, not bbox dimensions, is what makes
  // an axis-aligned arrow a real draw vs. an accidental click.
  isTooSmall: (node) => {
    const arrow = node as ArrowNode; // this tool only ever builds ArrowNodes
    return Math.hypot(arrow.x2 - arrow.x, arrow.y2 - arrow.y) < MIN_DRAW_SIZE;
  },
});
