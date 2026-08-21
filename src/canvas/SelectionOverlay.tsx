import { getSceneCorners } from "./selectionBounds";
import { getGroupBounds, getGroupHandles } from "./tools/groupResize";
import { getHandles } from "./tools/resizeHandles";
import { useCanvasSize } from "./useCanvasSize";
import { useMarquee } from "./useMarquee";
import { useSceneGraph } from "./useSceneGraph";
import { useSelection } from "./useSelection";
import { useViewport } from "./useViewport";
import { getComponent } from "../store/componentsStore";
import { parseVirtualId } from "../store/instanceVirtualId";
import { resolveInstance } from "../store/resolveInstance";
import type { NodeId, SceneNode } from "../types/scene";
import { sceneToScreen } from "../utils/coordinates";

// A node inside a component instance has no entry in the real graph — same
// resolve-then-look-up path selectionBounds.ts's own virtual-id branch
// uses, just returning the node itself instead of its corners (needed here
// for the section-label check and the type-based branching below).
function resolveSelectableNode(id: NodeId, nodes: Record<NodeId, SceneNode>): SceneNode | null {
  const virtual = parseVirtualId(id);
  if (!virtual) return nodes[id] ?? null;

  const instance = nodes[virtual.instanceId];
  if (!instance || instance.type !== "instance") return null;
  const definition = getComponent(instance.componentId);
  if (!definition) return null;

  return resolveInstance(instance, definition).nodes[id] ?? null;
}

// CSS custom properties, not raw colors — read via the `style` prop below
// (not the plain SVG attribute) since var() only resolves in a CSS
// property context, so these stay theme-reactive across light/dark.
const STROKE_COLOR = "var(--selection)";
const STROKE_WIDTH = 2;
const HANDLE_SIZE = 8;
const HANDLE_FILL = "var(--surface-panel)";
const SECTION_LABEL_COLOR = "var(--canvas-label)";
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
  // No drag-to-resize handles for a node inside a component instance yet —
  // that field still only moves through the properties panel (see
  // PropertiesPanel.tsx's isInstanceChild comment) — but its outline still
  // draws below, from the selectedIdList.map pass.
  const handles = soleSelectedId && !parseVirtualId(soleSelectedId)
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
        const node = resolveSelectableNode(id, scene.nodes);
        const corners = getSceneCorners(id, scene.nodes);
        if (!node || !corners) return null;

        const screenCorners = corners.map((corner) => sceneToScreen(corner, viewport));
        const points = screenCorners.map((point) => `${point.x},${point.y}`).join(" ");
        const topLeft = screenCorners[0];

        return (
          <g key={id}>
            <polygon points={points} fill="none" style={{ stroke: STROKE_COLOR }} strokeWidth={STROKE_WIDTH} />
            {node.type === "section" && (
              <text
                x={topLeft.x}
                y={topLeft.y - SECTION_LABEL_OFFSET * viewport.zoom}
                fontSize={12 * viewport.zoom}
                fontFamily="sans-serif"
                style={{ fill: SECTION_LABEL_COLOR }}
              >
                {node.name}
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
              style={{ stroke: STROKE_COLOR }}
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
            style={{ fill: HANDLE_FILL, stroke: STROKE_COLOR }}
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
              style={{ fill: STROKE_COLOR, stroke: STROKE_COLOR }}
              fillOpacity={0.1}
              strokeWidth={1}
            />
          );
        })()}
    </svg>
  );
}
