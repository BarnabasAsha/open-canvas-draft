import { getWorldMatrix, parseVirtualId, resolveInstance } from "@open-canvas/commands";
import { getComponent } from "../store/componentsStore";
import type { ArrowNode, LineNode, NodeId, SceneNode } from "@open-canvas/schema";
import type { Point } from "../utils/coordinates";

export function getSceneCorners(
  nodeId: NodeId,
  nodes: Record<NodeId, SceneNode>,
): [Point, Point, Point, Point] | null {
  const virtual = parseVirtualId(nodeId);
  if (virtual) return getVirtualChildCorners(nodeId, virtual.instanceId, nodes);

  const node = nodes[nodeId];
  if (!node) return null;

  if (node.type === "line" || node.type === "arrow") {
    return getEndpointBoxCorners(node, nodes);
  }

  return cornersFromMatrix(getWorldMatrix(nodeId, nodes), node.width, node.height);
}

// A node INSIDE a component instance has no entry in the real graph — its
// corners come from resolving the instance (same as drawInstance.ts does
// to render it) and composing two matrices: the instance's own world
// transform, then the resolved child's transform WITHIN that instance
// (walking the resolved tree exactly the way getWorldMatrix already walks
// a real parentId chain, since a ResolvedSubtree is shaped just like one).
function getVirtualChildCorners(
  virtualId: NodeId,
  instanceId: NodeId,
  nodes: Record<NodeId, SceneNode>,
): [Point, Point, Point, Point] | null {
  const instance = nodes[instanceId];
  if (!instance || instance.type !== "instance") return null;

  const definition = getComponent(instance.componentId);
  if (!definition) return null;

  const resolved = resolveInstance(instance, definition);
  const childNode = resolved.nodes[virtualId];
  if (!childNode) return null;

  const instanceMatrix = getWorldMatrix(instanceId, nodes);
  const localMatrix = getWorldMatrix(virtualId, resolved.nodes);
  return cornersFromMatrix(instanceMatrix.multiply(localMatrix), childNode.width, childNode.height);
}

function cornersFromMatrix(matrix: DOMMatrix, width: number, height: number): [Point, Point, Point, Point] {
  const localCorners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
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
