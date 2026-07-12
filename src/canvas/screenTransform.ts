import type { NodeId, SceneNode } from "../types/scene";
import type { Point, Viewport } from "../utils/coordinates";
import { sceneToScreen } from "../utils/coordinates";
import { getWorldMatrix } from "../utils/worldTransform";

export interface ScreenTransform {
  position: Point;
  rotationDegrees: number;
}

// Decomposes a node's full local-to-screen transform (ancestors + its own
// rotation, then the viewport's pan/zoom) into a CSS-friendly position +
// angle, for positioning a real DOM element — an editing <textarea> — at
// exactly the spot the node renders on the canvas. SelectionOverlay only
// ever needed the 4 corner points for an SVG polygon; a DOM element needs
// position+rotation instead, since you can't hand a <textarea> four
// arbitrary corners.
export function getScreenTransform(
  nodeId: NodeId,
  nodes: Record<NodeId, SceneNode>,
  viewport: Viewport,
): ScreenTransform {
  const matrix = getWorldMatrix(nodeId, nodes);
  const rotationDegrees = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);

  const topLeft = matrix.transformPoint(new DOMPoint(0, 0));
  const position = sceneToScreen({ x: topLeft.x, y: topLeft.y }, viewport);

  return { position, rotationDegrees };
}
