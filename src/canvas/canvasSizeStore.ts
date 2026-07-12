import { createStore } from "../store/createStore";

export interface CanvasSize {
  width: number;
  height: number;
}

// A sane non-zero default so the very first render (before Canvas.tsx's
// ResizeObserver delivers its first measurement) doesn't draw into a 0x0
// canvas — overwritten within a frame of mounting.
const initialSize: CanvasSize = { width: 800, height: 600 };

export const canvasSizeStore = createStore<CanvasSize>(initialSize);
