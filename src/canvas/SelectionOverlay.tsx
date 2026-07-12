import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./canvasSize";
import { getSceneCorners } from "./selectionBounds";
import { getHandles } from "./tools/resizeHandles";
import { useSceneGraph } from "./useSceneGraph";
import { useSelection } from "./useSelection";
import { useViewport } from "./useViewport";
import { sceneToScreen } from "../utils/coordinates";

const STROKE_COLOR = "#4f46e5";
const STROKE_WIDTH = 2;
const HANDLE_SIZE = 8;

export function SelectionOverlay() {
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();
  const viewport = useViewport();

  const selectedIdList = [...selectedIds];
  const soleSelectedId = selectedIdList.length === 1 ? selectedIdList[0] : null;
  const handles = soleSelectedId ? getHandles(soleSelectedId, scene.nodes) : [];

  return (
    <svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {selectedIdList.map((id) => {
        const corners = getSceneCorners(id, scene.nodes);
        if (!corners) return null;

        const points = corners
          .map((corner) => sceneToScreen(corner, viewport))
          .map((point) => `${point.x},${point.y}`)
          .join(" ");

        return (
          <polygon key={id} points={points} fill="none" stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} />
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
