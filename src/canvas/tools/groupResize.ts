import { getParentOrigin } from "../../store/graphMutations";
import type { NodeId, SceneGraph, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { getSceneCorners } from "../selectionBounds";
import { HANDLE_AXES, MIN_SIZE, resizeAxis, scalePathPoints } from "./resizeMath";
import { getLocalHandlePoints, HANDLE_HIT_RADIUS } from "./resizeHandles";
import type { BBoxHandleId, Handle } from "./resizeHandles";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Union of every selected node's scene-space bounding box — the "virtual
// node" a multi-selection resizes as. Scene-space already, unlike a single
// node's own bbox, so no world-matrix step is needed to place the handles.
export function getGroupBounds(selectedIds: Iterable<NodeId>, nodes: Record<NodeId, SceneNode>): Bounds | null {
  let bounds: Bounds | null = null;

  for (const id of selectedIds) {
    const corners = getSceneCorners(id, nodes);
    if (!corners) continue;

    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const nodeBounds: Bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    bounds = bounds ? unionBounds(bounds, nodeBounds) : nodeBounds;
  }

  return bounds;
}

function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function getGroupHandles(bounds: Bounds): Handle[] {
  const local = getLocalHandlePoints(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  return (Object.keys(local) as BBoxHandleId[]).map((id) => ({
    id,
    point: { x: bounds.minX + local[id].x, y: bounds.minY + local[id].y },
  }));
}

export function hitTestGroupHandles(scenePoint: Point, bounds: Bounds, zoom: number): BBoxHandleId | null {
  const radius = HANDLE_HIT_RADIUS / zoom;
  for (const handle of getGroupHandles(bounds)) {
    const dx = handle.point.x - scenePoint.x;
    const dy = handle.point.y - scenePoint.y;
    if (Math.hypot(dx, dy) <= radius) return handle.id as BBoxHandleId;
  }
  return null;
}

export interface GroupScale {
  scaleX: number;
  scaleY: number;
  anchor: Point;
}

// Mirrors resizeMath.ts's resizeAxis, applied to the group's overall bounds
// instead of one node's — the edge opposite the dragged handle becomes the
// scale anchor, and every selected node scales around that same point so
// the whole selection resizes together instead of each node resizing
// toward its own center.
export function computeGroupScale(startBounds: Bounds, handleId: BBoxHandleId, scenePoint: Point): GroupScale {
  const axes = HANDLE_AXES[handleId];
  const startWidth = startBounds.maxX - startBounds.minX;
  const startHeight = startBounds.maxY - startBounds.minY;
  const horizontal = resizeAxis(startBounds.minX, startWidth, scenePoint.x, axes.horizontal);
  const vertical = resizeAxis(startBounds.minY, startHeight, scenePoint.y, axes.vertical);

  return {
    scaleX: startWidth === 0 ? 1 : horizontal.size / startWidth,
    scaleY: startHeight === 0 ? 1 : vertical.size / startHeight,
    anchor: {
      x: axes.horizontal === "min" ? startBounds.maxX : startBounds.minX,
      y: axes.vertical === "min" ? startBounds.maxY : startBounds.minY,
    },
  };
}

function scaleScenePoint(local: Point, parentOrigin: Point, scale: GroupScale): Point {
  const sceneX = parentOrigin.x + local.x;
  const sceneY = parentOrigin.y + local.y;
  const newSceneX = scale.anchor.x + (sceneX - scale.anchor.x) * scale.scaleX;
  const newSceneY = scale.anchor.y + (sceneY - scale.anchor.y) * scale.scaleY;
  return { x: newSceneX - parentOrigin.x, y: newSceneY - parentOrigin.y };
}

// Scales one node's position/size around the group's anchor point, leaving
// its own rotation untouched — the same "resize is a scale of the
// unrotated footprint, not a full affine transform" simplification
// single-node resize already accepts for rotated shapes (see
// getBBoxLocalPoint's comment), just applied per-node across a group.
export function resizeNodeInGroup(node: SceneNode, scale: GroupScale, graph: SceneGraph): SceneNode {
  const parentOrigin = getParentOrigin(graph, node.parentId);

  if (node.type === "line" || node.type === "arrow") {
    const start = scaleScenePoint({ x: node.x, y: node.y }, parentOrigin, scale);
    const end = scaleScenePoint({ x: node.x2, y: node.y2 }, parentOrigin, scale);
    return {
      ...node,
      x: start.x,
      y: start.y,
      x2: end.x,
      y2: end.y,
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  const origin = scaleScenePoint({ x: node.x, y: node.y }, parentOrigin, scale);
  const width = Math.max(node.width * scale.scaleX, MIN_SIZE);
  const height = Math.max(node.height * scale.scaleY, MIN_SIZE);

  if (node.type === "path") {
    return { ...node, x: origin.x, y: origin.y, width, height, points: scalePathPoints(node.points, scale.scaleX, scale.scaleY) };
  }
  return { ...node, x: origin.x, y: origin.y, width, height };
}
