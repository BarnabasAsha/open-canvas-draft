import type { LineNode } from "@open-canvas/schema";
import { createDragToCreateTool, MIN_DRAW_SIZE } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const lineTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): LineNode => ({
    id,
    type: "line",
    name: "Line",
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
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    stroke: "#111827",
    strokeWidth: 2,
    strokeStyle: "solid",
  }),
  // A perfectly horizontal or vertical line has a real width/height of 0 in
  // one axis — the bbox "either dimension trivial" rule would always
  // discard it, so length (distance between the two endpoints) is what
  // actually distinguishes a real draw from an accidental click here.
  isTooSmall: (node) => {
    const line = node as LineNode; // this tool only ever builds LineNodes
    return Math.hypot(line.x2 - line.x, line.y2 - line.y) < MIN_DRAW_SIZE;
  },
});
