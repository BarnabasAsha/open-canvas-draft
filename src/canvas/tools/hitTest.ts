import { nodeKinds } from "../renderer/nodeKinds";
import type { NodeId, SceneGraph, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { applyNodeTransform } from "../renderer/applyNodeTransform";

function createScratchContext(): CanvasRenderingContext2D {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("2d context unavailable for hit-testing");
  return ctx;
}

const scratchCtx = createScratchContext();

export function hitTestScene(scenePoint: Point, scene: SceneGraph): NodeId | null {
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  return hitTestSiblings(scenePoint, scene, [...scene.rootIds].reverse());
}

// Reversed order: later-drawn (topmost) siblings are tested first, and we
// return on the first hit — equivalent to "topmost wins" without needing a
// flat z-order list.
function hitTestSiblings(scenePoint: Point, scene: SceneGraph, ids: NodeId[]): NodeId | null {
  for (const id of ids) {
    const node = scene.nodes[id];
    if (!node || !node.visible || node.locked) continue;

    scratchCtx.save();
    applyNodeTransform(scratchCtx, node);
    const hit = hitTestNode(scenePoint, node, scene);
    scratchCtx.restore();

    if (hit) return hit;
  }
  return null;
}

function hitTestNode(scenePoint: Point, node: SceneNode, scene: SceneGraph): NodeId | null {
  if (node.type === "frame" || node.type === "section" || node.type === "group") {
    const childHit = hitTestSiblings(scenePoint, scene, [...node.children].reverse());
    if (childHit) return childHit;
  }

  return hitTestOwnBody(scenePoint, node) ? node.id : null;
}

function hitTestOwnBody(scenePoint: Point, node: SceneNode): boolean {
  // See drawNode.ts for why this cast is needed — nodeKinds is keyed by
  // SceneNode["type"], which TS can't correlate back to node's narrowed
  // type at the lookup site.
  return nodeKinds[node.type].hitTestOwnBody(scratchCtx, node as never, scenePoint.x, scenePoint.y);
}
