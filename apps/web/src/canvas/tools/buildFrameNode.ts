import type { FrameNode, NodeId } from "@open-canvas/schema";

// Pulled out of frameTool.ts on its own — frameTool.ts's other export
// (the frameTool Tool object, via createDragToCreateTool) sits in a real
// circular dependency with toolManager.ts (toolManager imports frameTool,
// dragToCreateTool.ts imports toolManager). Any consumer that only wants
// this pure builder — CanvasEditorPage.tsx's placeFramePreset, and the
// webmcp add_element tool — doesn't need to pull in that cycle at all, and
// importing it via frameTool.ts risked exactly that: a "Cannot access
// 'frameTool' before initialization" TDZ error whenever some other new
// import path reached this module before toolManager.ts's own did.
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
