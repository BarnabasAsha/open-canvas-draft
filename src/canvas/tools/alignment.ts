import { getSceneCorners } from "../selectionBounds";
import type { NodeId, SceneGraph, SceneNode } from "../../types/scene";
import { getGroupBounds } from "./groupResize";

export type AlignKind = "left" | "centerH" | "right" | "top" | "centerV" | "bottom";

// Reference box is the union of every selected node's own scene-space
// bounds (same helper the group-resize path already uses) — deliberately
// not restricted to a shared parent. Aligning two things that happen to
// live in different frames is a completely ordinary thing to want, and
// scene-space bounds already make that work with no extra cases.
export function computeAlignedNodes(nodeIds: readonly NodeId[], graph: SceneGraph, kind: AlignKind): Map<NodeId, SceneNode> {
  const bounds = getGroupBounds(nodeIds, graph.nodes);
  const updated = new Map<NodeId, SceneNode>();
  if (!bounds) return updated;

  const boundsCenterX = (bounds.minX + bounds.maxX) / 2;
  const boundsCenterY = (bounds.minY + bounds.maxY) / 2;

  for (const id of nodeIds) {
    const node = graph.nodes[id];
    const corners = node && !node.locked ? getSceneCorners(id, graph.nodes) : null;
    if (!node || !corners) continue;

    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const nodeMinX = Math.min(...xs);
    const nodeMaxX = Math.max(...xs);
    const nodeMinY = Math.min(...ys);
    const nodeMaxY = Math.max(...ys);

    let dx = 0;
    let dy = 0;
    switch (kind) {
      case "left":
        dx = bounds.minX - nodeMinX;
        break;
      case "right":
        dx = bounds.maxX - nodeMaxX;
        break;
      case "centerH":
        dx = boundsCenterX - (nodeMinX + nodeMaxX) / 2;
        break;
      case "top":
        dy = bounds.minY - nodeMinY;
        break;
      case "bottom":
        dy = bounds.maxY - nodeMaxY;
        break;
      case "centerV":
        dy = boundsCenterY - (nodeMinY + nodeMaxY) / 2;
        break;
    }

    if (dx === 0 && dy === 0) continue;
    updated.set(id, shiftNode(node, dx, dy));
  }

  return updated;
}

// A scene-space delta can be added directly to a node's own parent-relative
// x/y with no origin conversion — translation between scene space and any
// unrotated ancestor's local space is a pure offset, so a shift is the same
// vector in both (the same assumption reparentNodeInGraph/translateNode
// already rely on elsewhere).
function shiftNode(node: SceneNode, dx: number, dy: number): SceneNode {
  if (node.type === "line" || node.type === "arrow") {
    return { ...node, x: node.x + dx, y: node.y + dy, x2: node.x2 + dx, y2: node.y2 + dy };
  }
  return { ...node, x: node.x + dx, y: node.y + dy };
}
