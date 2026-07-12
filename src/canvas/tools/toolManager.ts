import { createStore } from "../../store/createStore";
import { arrowTool } from "./arrowTool";
import { ellipseTool } from "./ellipseTool";
import { frameTool } from "./frameTool";
import { imageTool } from "./imageTool";
import { lineTool } from "./lineTool";
import { penTool } from "./penTool";
import { rectangleTool } from "./rectangleTool";
import { sectionTool } from "./sectionTool";
import { selectTool } from "./selectTool";
import { textTool } from "./textTool";
import type { Tool, ToolPointerEvent } from "./toolTypes";

export type ToolId =
  | "select"
  | "frame"
  | "section"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "pen"
  | "text"
  | "image";

const tools: Record<ToolId, Tool> = {
  select: selectTool,
  frame: frameTool,
  section: sectionTool,
  rectangle: rectangleTool,
  ellipse: ellipseTool,
  line: lineTool,
  arrow: arrowTool,
  pen: penTool,
  text: textTool,
  image: imageTool,
};

// The active tool is tracked by id (not the Tool object itself) so UI —
// the toolbar, keyboard shortcuts — can reference it by a stable string
// and observe changes via the same createStore pattern every other store
// in this app uses, rather than each caller needing a reference to the
// concrete Tool instance.
const store = createStore<ToolId>("select");

function setActiveTool(id: ToolId): void {
  if (store.getState() === id) return; // no-op switch shouldn't cancel an in-progress session
  activeTool().onDeactivate?.();
  store.update(() => id);
}

function activeTool(): Tool {
  return tools[store.getState()];
}

function onPointerDown(event: ToolPointerEvent): void {
  activeTool().onPointerDown(event);
}

function onPointerMove(event: ToolPointerEvent): void {
  activeTool().onPointerMove(event);
}

function onPointerUp(event: ToolPointerEvent): void {
  activeTool().onPointerUp(event);
}

function getCursor(): string {
  return activeTool().getCursor();
}

function onDoubleClick(event: ToolPointerEvent): void {
  activeTool().onDoubleClick?.(event);
}

function onKeyDown(event: KeyboardEvent): void {
  activeTool().onKeyDown?.(event);
}

export const toolManager = {
  ...store,
  setActiveTool,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onKeyDown,
  getCursor,
};
