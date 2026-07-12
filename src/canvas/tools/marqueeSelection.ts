import { getSceneCorners } from "../selectionBounds";
import type { NodeId, SceneGraph } from "../../types/scene";
import type { Point } from "../../utils/coordinates";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rectBounds(a: Point, b: Point): Bounds {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

function nodeBounds(nodeId: NodeId, nodes: SceneGraph["nodes"]): Bounds | null {
  const corners = getSceneCorners(nodeId, nodes);
  if (!corners) return null;
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// Top-level (rootIds) nodes only — matches how most design tools treat a
// canvas-level marquee drag; selecting a specific child nested inside a
// frame/section still goes through a direct click, same as before this
// existed. Locked/invisible nodes are skipped, matching hitTestScene's own
// rule for plain click-to-select.
export function marqueeSelectedIds(scene: SceneGraph, start: Point, end: Point): Set<NodeId> {
  const marqueeBounds = rectBounds(start, end);
  const result = new Set<NodeId>();

  for (const id of scene.rootIds) {
    const node = scene.nodes[id];
    if (!node || !node.visible || node.locked) continue;

    const bounds = nodeBounds(id, scene.nodes);
    if (bounds && boundsOverlap(marqueeBounds, bounds)) result.add(id);
  }

  return result;
}
