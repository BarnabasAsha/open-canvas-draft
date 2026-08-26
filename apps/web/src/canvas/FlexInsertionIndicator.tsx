import { useCanvasSize } from "./useCanvasSize";
import { useFlexInsertion } from "./useFlexInsertion";
import { useViewport } from "./useViewport";
import { sceneToScreen } from "../utils/coordinates";

// Same accent color as SelectionOverlay's own outline (var(--selection) is
// itself just var(--accent)) — no separate "insertion" token exists in
// theme.css, and a thin line vs. a selection rectangle already reads as a
// different kind of marker at a glance, same as Figma's own insertion line.
const LINE_COLOR = "var(--accent)";
const LINE_WIDTH = 2;

export function FlexInsertionIndicator() {
  const insertion = useFlexInsertion();
  const viewport = useViewport();
  const canvasSize = useCanvasSize();

  if (!insertion) return null;

  const p1 = sceneToScreen(insertion.line.p1, viewport);
  const p2 = sceneToScreen(insertion.line.p2, viewport);

  return (
    <svg
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} style={{ stroke: LINE_COLOR }} strokeWidth={LINE_WIDTH} />
    </svg>
  );
}
