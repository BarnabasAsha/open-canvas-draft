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
  // Optional: only penTool currently implements this (Enter finishes an
  // open path, Escape cancels the in-progress one).
  onKeyDown?(event: KeyboardEvent): void;
  // Optional: called on the OUTGOING tool right before the active tool
  // changes to something else. Every other tool's in-progress state lives
  // entirely within one pointerdown-to-pointerup gesture, so there's never
  // anything to clean up mid-gesture in practice. The pen tool is the first
  // one whose session deliberately spans many separate clicks with
  // arbitrary time between them — switching tools mid-path (e.g. clicking
  // the toolbar's Select button after placing a few anchors) is a very
  // natural thing to do, and without this hook the half-drawn draft node
  // would be silently orphaned: live in the scene, but never committed to
  // history and with no way to remove it.
  onDeactivate?(): void;
}
