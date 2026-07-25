import { computeRulerTicks } from "./rulerTicks";
import { useCanvasSize } from "./useCanvasSize";
import { useViewport } from "./useViewport";

export const RULER_SIZE = 20;

// Reads viewport/canvas-size stores directly, like SelectionOverlay and
// TextEditOverlay already do — this is canvas chrome tightly coupled to
// live scene state, not a reusable presentational piece.
export function Ruler() {
  const viewport = useViewport();
  const canvasSize = useCanvasSize();
  const xTicks = computeRulerTicks(viewport, canvasSize.width, "x");
  const yTicks = computeRulerTicks(viewport, canvasSize.height, "y");

  return (
    <>
      <div className="ruler-corner" style={{ gridColumn: 1, gridRow: 1 }} />
      <div className="ruler ruler-horizontal" style={{ gridColumn: 2, gridRow: 1 }}>
        <svg width={canvasSize.width} height={RULER_SIZE}>
          {xTicks.map((tick) => (
            <g key={tick.scenePos}>
              <line x1={tick.screenPos} y1={12} x2={tick.screenPos} y2={RULER_SIZE} style={{ stroke: "var(--text-muted)" }} strokeWidth={1} />
              <text x={tick.screenPos + 3} y={10} style={{ fill: "var(--text-muted)" }} fontSize={9}>
                {tick.scenePos}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="ruler ruler-vertical" style={{ gridColumn: 1, gridRow: 2 }}>
        <svg width={RULER_SIZE} height={canvasSize.height}>
          {yTicks.map((tick) => (
            <g key={tick.scenePos}>
              <line x1={12} y1={tick.screenPos} x2={RULER_SIZE} y2={tick.screenPos} style={{ stroke: "var(--text-muted)" }} strokeWidth={1} />
              <text x={2} y={tick.screenPos + 9} style={{ fill: "var(--text-muted)" }} fontSize={9}>
                {tick.scenePos}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}
