import type { NodeId, SceneGraph } from "../../types/scene";
import { getSceneCorners } from "../selectionBounds";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Finds the topmost container (frame/section) whose bounds fully enclose
// the given node's bounds, or null if none does. Mirrors hitTest.ts's
// traversal — children checked before a container's own body, siblings in
// reverse order so the last-drawn/topmost candidate wins — so "what would
// this land inside if dropped here" agrees with "what would a click here
// select".
export function findContainerAt(nodeId: NodeId, scene: SceneGraph): NodeId | null {
  const nodeBounds = getBounds(nodeId, scene);
  if (!nodeBounds) return null;

  return searchSiblings(scene, [...scene.rootIds].reverse(), nodeId, nodeBounds);
}

function searchSiblings(scene: SceneGraph, ids: NodeId[], excludeId: NodeId, nodeBounds: Bounds): NodeId | null {
  for (const id of ids) {
    if (id === excludeId) continue;

    const candidate = scene.nodes[id];
    if (!candidate || !candidate.visible) continue;
    if (candidate.type !== "frame" && candidate.type !== "section") continue;

    const childMatch = searchSiblings(scene, [...candidate.children].reverse(), excludeId, nodeBounds);
    if (childMatch) return childMatch;

    const containerBounds = getBounds(id, scene);
    if (containerBounds && isFullyInside(nodeBounds, containerBounds)) return id;
  }
  return null;
}

function getBounds(nodeId: NodeId, scene: SceneGraph): Bounds | null {
  const corners = getSceneCorners(nodeId, scene.nodes);
  if (!corners) return null;

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function isFullyInside(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY
  );
}
