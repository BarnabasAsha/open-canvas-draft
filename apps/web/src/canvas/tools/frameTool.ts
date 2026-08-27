import type { FrameNode, NodeId } from "@open-canvas/schema";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

// Shared with the frame-preset picker (StructureMenu/App.tsx), which places
// a frame directly at a fixed size instead of dragging one out by hand —
// same node shape either way, just a different way of arriving at x/y/w/h.
export function buildFrameNode(id: NodeId, name: string, x: number, y: number, width: number, height: number): FrameNode {
  return {
    id,
    type: "frame",
    name,
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    fill: "#ffffff",
    stroke: null,
    strokeWidth: 0,
    strokeStyle: "solid",
    clipsContent: true,
    cornerRadius: 0,
    layoutMode: "none",
    direction: "row",
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAxisAlign: "start",
    crossAxisAlign: "start",
    children: [],
  };
}

export const frameTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current) => {
    const { x, y, width, height } = rectFromPoints(start, current);
    return buildFrameNode(id, "Frame", x, y, width, height);
  },
});
