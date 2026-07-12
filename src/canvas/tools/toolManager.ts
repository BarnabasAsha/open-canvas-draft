import { selectTool } from "./selectTool";
import type { Tool, ToolPointerEvent } from "./toolTypes";

let activeTool: Tool = selectTool;

function setActiveTool(tool: Tool): void {
  activeTool = tool;
}

function onPointerDown(event: ToolPointerEvent): void {
  activeTool.onPointerDown(event);
}

function onPointerMove(event: ToolPointerEvent): void {
  activeTool.onPointerMove(event);
}

function onPointerUp(event: ToolPointerEvent): void {
  activeTool.onPointerUp(event);
}

function getCursor(): string {
  return activeTool.getCursor();
}

export const toolManager = { setActiveTool, onPointerDown, onPointerMove, onPointerUp, getCursor };
