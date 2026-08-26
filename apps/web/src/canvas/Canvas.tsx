import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef } from "react";
import { documentStore } from "../store/documentStore";
import { sceneStore } from "../store/sceneStore";
import { selectionStore } from "../store/selectionStore";
import { viewportStore } from "../store/viewportStore";
import { screenToScene } from "../utils/coordinates";
import { NodeContextMenu } from "../ui/ContextMenu/NodeContextMenu";
import { canvasSizeStore } from "./canvasSizeStore";
import { drawScene } from "./renderer/drawScene";
import { subscribeImageLoad } from "./renderer/imageCache";
import { hitTestScene } from "./tools/hitTest";
import { toolManager } from "./tools/toolManager";
import type { ToolPointerEvent } from "./tools/toolTypes";
import { panBy, zoomAtPoint } from "./viewportControls";

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

    let width = 0;
    let height = 0;

    const render = () =>
      drawScene(
        ctx,
        sceneStore.getState(),
        width,
        height,
        documentStore.getState().backgroundColor,
        viewportStore.getState(),
        documentStore.getState().gridVisible,
      );

    // The canvas element is CSS-sized to fill its flex parent (see the
    // `width: "100%", height: "100%"` below), so its actual pixel size
    // depends on layout, not a fixed constant — a ResizeObserver is the
    // DOM-side-effect equivalent of the store subscriptions below: it
    // reacts to a real external change (the container's box), not to a
    // React re-render, so imperatively resizing/redrawing here doesn't
    // conflict with the "no useEffect for render-driven redraw" rule.
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      width = Math.round(entry.contentRect.width);
      height = Math.round(entry.contentRect.height);
      if (width === 0 || height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      canvasSizeStore.update(() => ({ width, height }));
      render();
    });
    resizeObserver.observe(canvas);

    const unsubscribeScene = sceneStore.subscribe(render);
    const unsubscribeImages = subscribeImageLoad(render);
    const unsubscribeDocument = documentStore.subscribe(render);
    const unsubscribeViewport = viewportStore.subscribe(render);

    // A Google Font requested via a text node's fontFamily may still be
    // downloading the first time it's drawn — the browser silently falls
    // back to a default font rather than erroring, so without this the
    // canvas would just keep showing the fallback forever. "loadingdone"
    // fires whenever any font finishes loading anywhere on the page, which
    // is a broader signal than "the one font this canvas cares about" but
    // redrawing on a no-op font change is harmless, and it means this
    // doesn't need to track which families are actually in use.
    document.fonts.addEventListener("loadingdone", render);

    // A native, non-passive listener rather than React's onWheel — browsers
    // may treat wheel listeners as passive by default, which would silently
    // ignore preventDefault() and let Ctrl+scroll fall through to the
    // browser's own page-zoom instead of ours.
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.ctrlKey) {
        // Trackpad pinch is delivered as a wheel event with ctrlKey set —
        // same gesture browsers use for their own page-zoom, so this one
        // check covers both pinch and an explicit Ctrl/Cmd+scroll.
        const zoomFactor = Math.exp(-e.deltaY * 0.002);
        viewportStore.update((viewport) => zoomAtPoint(viewport, screenPoint, zoomFactor));
      } else {
        viewportStore.update((viewport) => panBy(viewport, e.deltaX, e.deltaY));
      }
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      unsubscribeScene();
      unsubscribeImages();
      unsubscribeDocument();
      unsubscribeViewport();
      canvas.removeEventListener("wheel", handleWheel);
      document.fonts.removeEventListener("loadingdone", render);
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

  // Right-clicking a node that isn't selected replaces the selection with
  // it, same as every other design tool; right-clicking one already
  // inside a multi-selection leaves the selection as-is, so the menu
  // applies to the whole set. Right-clicking empty canvas leaves whatever
  // was selected untouched — the menu still opens (NodeContextMenu greys
  // out every item when there's no selection) rather than needing to
  // fight Base UI's own open-on-contextmenu behavior to suppress it.
  const handleContextMenu = (e: ReactMouseEvent) => {
    const scenePoint = screenToScene({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }, viewportStore.getState());
    const hitId = hitTestScene(scenePoint, sceneStore.getState());
    if (!hitId) return;

    const { selectedIds } = selectionStore.getState();
    if (!selectedIds.has(hitId)) {
      selectionStore.update((state) => ({ ...state, selectedIds: new Set([hitId]) }));
    }
  };

  return (
    <NodeContextMenu onContextMenu={handleContextMenu} style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />
    </NodeContextMenu>
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
