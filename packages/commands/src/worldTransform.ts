import type { NodeId, SceneNode } from "@open-canvas/schema";

export interface Point {
  x: number;
  y: number;
}

// The one place `matrix.transformPoint(new DOMPoint(...))` is spelled out —
// every other file that needs to run a point through a DOMMatrix (scene
// corners, resize handles, the flex drag-insertion indicator, ...) calls
// this instead of re-deriving the same three lines locally.
export function transformPoint(matrix: DOMMatrix, point: Point): Point {
  const transformed = matrix.transformPoint(new DOMPoint(point.x, point.y));
  return { x: transformed.x, y: transformed.y };
}

// Composes a node's full local-to-scene transform by walking its parentId
// chain root-first (translate then rotate-around-center per ancestor,
// matching the renderer's own per-node transform). Shared by rendering-
// adjacent geometry (selection outlines, resize handles) and the store's
// graph mutations (reparenting needs it to keep a node's on-screen position
// stable across a parent change) — kept in utils/ rather than canvas/ so
// store/ can depend on it without depending on canvas/.
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
