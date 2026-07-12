import type { Point } from "../../utils/coordinates";

export interface ToolPointerEvent {
  scenePoint: Point;
  shiftKey: boolean;
}

export interface Tool {
  onPointerDown(event: ToolPointerEvent): void;
  onPointerMove(event: ToolPointerEvent): void;
  onPointerUp(event: ToolPointerEvent): void;
  getCursor(): string;
  // Optional: only selectTool currently implements this (re-enter text
  // edit on a double-clicked text node). Other tools just ignore it — a
  // double-click while drawing a shape looks like two ordinary clicks to
  // them, which is harmless.
  onDoubleClick?(event: ToolPointerEvent): void;
}
