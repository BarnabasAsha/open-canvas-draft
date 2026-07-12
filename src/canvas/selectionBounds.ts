import type { ArrowNode, LineNode, NodeId, SceneNode } from "../types/scene";
import type { Point } from "../utils/coordinates";

export function getSceneCorners(
  nodeId: NodeId,
  nodes: Record<NodeId, SceneNode>,
): [Point, Point, Point, Point] | null {
  const node = nodes[nodeId];
  if (!node) return null;

  if (node.type === "line" || node.type === "arrow") {
    return getEndpointBoxCorners(node, nodes);
  }

  const matrix = getWorldMatrix(nodeId, nodes);
  const localCorners: Point[] = [
    { x: 0, y: 0 },
    { x: node.width, y: 0 },
    { x: node.width, y: node.height },
    { x: 0, y: node.height },
  ];

  return localCorners.map((corner) => {
    const transformed = matrix.transformPoint(new DOMPoint(corner.x, corner.y));
    return { x: transformed.x, y: transformed.y };
  }) as [Point, Point, Point, Point];
}

// Line/arrow don't fit the (0,0)-(width,height) bbox model — x/y is the
// start point, not necessarily a bbox corner, so if the endpoint is dragged
// up or left of the start, x2 < x or y2 < y and that model breaks. Build the
// box directly from the min/max of the two endpoints instead, through the
// ancestor-only transform (matching resizeHandles.ts's treatment of these
// types — the node's own rotation is a known TODO, see resizeMath.ts).
function getEndpointBoxCorners(
  node: LineNode | ArrowNode,
  nodes: Record<NodeId, SceneNode>,
): [Point, Point, Point, Point] {
  const ancestorMatrix = node.parentId ? getWorldMatrix(node.parentId, nodes) : new DOMMatrix();

  const minX = Math.min(node.x, node.x2);
  const maxX = Math.max(node.x, node.x2);
  const minY = Math.min(node.y, node.y2);
  const maxY = Math.max(node.y, node.y2);

  const localCorners: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  return localCorners.map((corner) => {
    const transformed = ancestorMatrix.transformPoint(new DOMPoint(corner.x, corner.y));
    return { x: transformed.x, y: transformed.y };
  }) as [Point, Point, Point, Point];
}

export function getWorldMatrix(nodeId: NodeId, nodes: Record<NodeId, SceneNode>): DOMMatrix {
  const ancestorChain: SceneNode[] = [];
  let currentId: NodeId | null = nodeId;

  while (currentId) {
    const node: SceneNode | undefined = nodes[currentId];
    if (!node) break;
    ancestorChain.push(node);
    currentId = node.parentId;
  }
  ancestorChain.reverse(); // root-most ancestor first

  let matrix = new DOMMatrix();
  for (const node of ancestorChain) {
    matrix = matrix.translate(node.x, node.y);
    if (node.rotation !== 0) {
      const pivotX = node.width / 2;
      const pivotY = node.height / 2;
      matrix = matrix.translate(pivotX, pivotY).rotate(node.rotation).translate(-pivotX, -pivotY);
    }
  }

  return matrix;
}
