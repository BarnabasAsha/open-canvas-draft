import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef } from "react";
import { sceneStore } from "../store/sceneStore";
import { viewportStore } from "../store/viewportStore";
import { screenToScene } from "../utils/coordinates";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./canvasSize";
import { drawScene } from "./renderer/drawScene";
import { subscribeImageLoad } from "./renderer/imageCache";
import { toolManager } from "./tools/toolManager";
import type { ToolPointerEvent } from "./tools/toolTypes";

// What toToolEvent actually needs from either React event type — just
// enough to share one conversion function between pointer events and the
// native "dblclick" event (a plain MouseEvent, not a PointerEvent).
interface PositionedEvent {
  nativeEvent: { offsetX: number; offsetY: number };
  shiftKey: boolean;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const render = () => drawScene(ctx, sceneStore.getState(), CANVAS_WIDTH, CANVAS_HEIGHT);

    render();
    const unsubscribeScene = sceneStore.subscribe(render);
    const unsubscribeImages = subscribeImageLoad(render);

    return () => {
      unsubscribeScene();
      unsubscribeImages();
    };
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    toolManager.onPointerDown(toToolEvent(e));
    applyCursor(e.currentTarget);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    toolManager.onPointerMove(toToolEvent(e));
    applyCursor(e.currentTarget);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    toolManager.onPointerUp(toToolEvent(e));
    applyCursor(e.currentTarget);
  };

  // A separate native "dblclick" handler rather than reading .detail off
  // pointerdown — PointerEvent.detail isn't reliable for click-counting
  // the way MouseEvent's is, but dblclick is the browser's own correctly-
  // resolved double-click signal.
  const handleDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    toolManager.onDoubleClick(toToolEvent(e));
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}

function applyCursor(canvas: HTMLCanvasElement): void {
  canvas.style.cursor = toolManager.getCursor();
}

function toToolEvent(e: PositionedEvent): ToolPointerEvent {
  const screenPoint = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  return {
    scenePoint: screenToScene(screenPoint, viewportStore.getState()),
    shiftKey: e.shiftKey,
  };
}
