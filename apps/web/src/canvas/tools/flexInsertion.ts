import { getWorldMatrix, transformPoint } from "@open-canvas/commands";
import type { FrameNode, NodeId, SceneGraph, SectionNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import { getAncestorLocalPoint } from "./resizeMath";

export interface FlexInsertionResult {
  index: number;
  // Scene-space endpoints — same coordinate space SelectionOverlay already
  // renders in, so the indicator component needs no extra container
  // lookup of its own.
  line: { p1: Point; p2: Point };
}

// Returns null when the target container isn't flex-mode — the caller
// falls back to today's plain append/reparent with no index. Otherwise
// projects `scenePoint` onto the container's main axis against its flow
// children's current (already flex-resolved) positions, to find where a
// drop would land in the order.
export function findFlexInsertionIndex(
  scenePoint: Point,
  containerId: NodeId,
  scene: SceneGraph,
  excludeIds: ReadonlySet<NodeId>,
): FlexInsertionResult | null {
  const container = scene.nodes[containerId];
  if (!container || (container.type !== "frame" && container.type !== "section") || container.layoutMode !== "flex") {
    return null;
  }

  const flowChildIds = container.children.filter((id) => {
    if (excludeIds.has(id)) return false;
    const child = scene.nodes[id];
    return child !== undefined && child.positioning === "flow";
  });

  const isRow = container.direction === "row";
  const localPoint = getAncestorLocalPoint(scenePoint, containerId, scene.nodes);
  const mainCoord = isRow ? localPoint.x : localPoint.y;

  const midpoints = flowChildIds.map((id) => {
    const child = scene.nodes[id]!;
    return isRow ? child.x + child.width / 2 : child.y + child.height / 2;
  });

  let index = 0;
  while (index < midpoints.length && midpoints[index] < mainCoord) index++;

  const boundary = mainAxisBoundary(index, flowChildIds, scene, isRow, container);
  const line = buildLine(boundary, isRow, container, containerId, scene);

  return { index, line };
}

function mainAxisBoundary(
  index: number,
  flowChildIds: NodeId[],
  scene: SceneGraph,
  isRow: boolean,
  container: FrameNode | SectionNode,
): number {
  if (flowChildIds.length === 0) return isRow ? container.padding.left : container.padding.top;

  if (index === 0) {
    const first = scene.nodes[flowChildIds[0]]!;
    return (isRow ? first.x : first.y) - container.gap / 2;
  }
  if (index >= flowChildIds.length) {
    const last = scene.nodes[flowChildIds[flowChildIds.length - 1]]!;
    return (isRow ? last.x + last.width : last.y + last.height) + container.gap / 2;
  }

  const prev = scene.nodes[flowChildIds[index - 1]]!;
  const next = scene.nodes[flowChildIds[index]]!;
  const prevEnd = isRow ? prev.x + prev.width : prev.y + prev.height;
  const nextStart = isRow ? next.x : next.y;
  return (prevEnd + nextStart) / 2;
}

// Spans the container's cross-axis content extent, perpendicular to the
// main axis, at the resolved boundary coordinate — then transformed into
// scene space through the container's own world matrix, same composition
// rule as everything else that maps a container-local point to the canvas.
function buildLine(
  boundary: number,
  isRow: boolean,
  container: FrameNode | SectionNode,
  containerId: NodeId,
  scene: SceneGraph,
): { p1: Point; p2: Point } {
  const matrix = getWorldMatrix(containerId, scene.nodes);
  const crossStart = isRow ? container.padding.top : container.padding.left;
  const crossEnd = isRow ? container.height - container.padding.bottom : container.width - container.padding.right;

  const local1 = isRow ? { x: boundary, y: crossStart } : { x: crossStart, y: boundary };
  const local2 = isRow ? { x: boundary, y: crossEnd } : { x: crossEnd, y: boundary };

  return { p1: transformPoint(matrix, local1), p2: transformPoint(matrix, local2) };
}
