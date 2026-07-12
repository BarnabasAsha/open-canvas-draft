import { getSceneCorners } from "./selectionBounds";
import { getGroupBounds, getGroupHandles } from "./tools/groupResize";
import { getHandles } from "./tools/resizeHandles";
import { useCanvasSize } from "./useCanvasSize";
import { useMarquee } from "./useMarquee";
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
  const marquee = useMarquee();

  const selectedIdList = [...selectedIds];
  const soleSelectedId = selectedIdList.length === 1 ? selectedIdList[0] : null;
  const groupBounds = selectedIdList.length > 1 ? getGroupBounds(selectedIds, scene.nodes) : null;
  const handles = soleSelectedId
    ? getHandles(soleSelectedId, scene.nodes)
    : groupBounds
      ? getGroupHandles(groupBounds)
      : [];

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
      {groupBounds &&
        (() => {
          const topLeft = sceneToScreen({ x: groupBounds.minX, y: groupBounds.minY }, viewport);
          const bottomRight = sceneToScreen({ x: groupBounds.maxX, y: groupBounds.maxY }, viewport);
          return (
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bottomRight.x - topLeft.x}
              height={bottomRight.y - topLeft.y}
              fill="none"
              stroke={STROKE_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })()}
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
      {marquee &&
        (() => {
          const p1 = sceneToScreen(marquee.start, viewport);
          const p2 = sceneToScreen(marquee.current, viewport);
          return (
            <rect
              x={Math.min(p1.x, p2.x)}
              y={Math.min(p1.y, p2.y)}
              width={Math.abs(p2.x - p1.x)}
              height={Math.abs(p2.y - p1.y)}
              fill={STROKE_COLOR}
              fillOpacity={0.1}
              stroke={STROKE_COLOR}
              strokeWidth={1}
            />
          );
        })()}
    </svg>
  );
}
