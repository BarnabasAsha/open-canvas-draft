import { getSceneCorners } from "./selectionBounds";
import { getHandles } from "./tools/resizeHandles";
import { useCanvasSize } from "./useCanvasSize";
import { useSceneGraph } from "./useSceneGraph";
import { useSelection } from "./useSelection";
import { useViewport } from "./useViewport";
import { sceneToScreen } from "../utils/coordinates";

const STROKE_COLOR = "#4f46e5";
const STROKE_WIDTH = 2;
const HANDLE_SIZE = 8;
const SECTION_LABEL_COLOR = "#9ca3af";
const SECTION_LABEL_OFFSET = 4;

export function SelectionOverlay() {
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();
  const viewport = useViewport();
  const canvasSize = useCanvasSize();

  const selectedIdList = [...selectedIds];
  const soleSelectedId = selectedIdList.length === 1 ? selectedIdList[0] : null;
  const handles = soleSelectedId ? getHandles(soleSelectedId, scene.nodes) : [];

  return (
    <svg
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {selectedIdList.map((id) => {
        const node = scene.nodes[id];
        const corners = getSceneCorners(id, scene.nodes);
        if (!node || !corners) return null;

        const screenCorners = corners.map((corner) => sceneToScreen(corner, viewport));
        const points = screenCorners.map((point) => `${point.x},${point.y}`).join(" ");
        const topLeft = screenCorners[0];

        return (
          <g key={id}>
            <polygon points={points} fill="none" stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} />
            {node.type === "section" && (
              <text
                x={topLeft.x}
                y={topLeft.y - SECTION_LABEL_OFFSET * viewport.zoom}
                fontSize={12 * viewport.zoom}
                fontFamily="sans-serif"
                fill={SECTION_LABEL_COLOR}
              >
                {node.label}
              </text>
            )}
          </g>
        );
      })}
      {handles.map((handle) => {
        const screen = sceneToScreen(handle.point, viewport);
        return (
          <rect
            key={handle.id}
            x={screen.x - HANDLE_SIZE / 2}
            y={screen.y - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
          />
        );
      })}
    </svg>
  );
}
