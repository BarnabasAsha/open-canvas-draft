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
}
