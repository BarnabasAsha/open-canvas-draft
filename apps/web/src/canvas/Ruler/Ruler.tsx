import { computeRulerTicks } from "../rulerTicks";
import { useCanvasSize } from "../useCanvasSize";
import { useViewport } from "../useViewport";
import styles from "./Ruler.module.css";

export const RULER_SIZE = 22;

// Reads viewport/canvas-size stores directly, like SelectionOverlay and
// TextEditOverlay already do — this is canvas chrome tightly coupled to
// live scene state, not a reusable presentational piece. Only the
// horizontal axis shows ticks (the redesign drops the vertical ruler); the
// left gutter stays as a blank strip purely for visual symmetry with the
// corner box.
export function Ruler() {
  const viewport = useViewport();
  const canvasSize = useCanvasSize();
  const xTicks = computeRulerTicks(viewport, canvasSize.width, "x");

  return (
    <>
      <div className={styles.gutter} style={{ gridColumn: 1, gridRow: 1 }} />
      <div className={styles.strip} style={{ gridColumn: 2, gridRow: 1 }}>
        <svg width={canvasSize.width} height={RULER_SIZE}>
          {xTicks.map((tick) => (
            <g key={tick.scenePos}>
              <line x1={tick.screenPos} y1={0} x2={tick.screenPos} y2={RULER_SIZE} style={{ stroke: "var(--border)" }} strokeWidth={1} />
              <text x={tick.screenPos + 4} y={RULER_SIZE - 6} style={{ fill: "var(--text-muted)" }} fontSize={9.5} fontFamily="var(--font-mono)">
                {tick.scenePos}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.gutter} style={{ gridColumn: 1, gridRow: 2, borderBottom: "none" }} />
    </>
  );
}
