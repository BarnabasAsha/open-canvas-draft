import type { NodeId, SceneGraph, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { applyNodeTransform } from "../renderer/applyNodeTransform";
import { buildArrowGeometry } from "../renderer/shapes/drawArrow";
import { buildEllipseGeometry } from "../renderer/shapes/drawEllipse";
import { buildLineGeometry } from "../renderer/shapes/drawLine";
import { buildPathGeometry } from "../renderer/shapes/drawPath";
import { buildRectGeometry } from "../renderer/shapes/drawRect";

const MIN_STROKE_HIT_WIDTH = 4;

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
  if (node.type === "frame" || node.type === "section") {
    const childHit = hitTestSiblings(scenePoint, scene, [...node.children].reverse());
    if (childHit) return childHit;
  }

  return hitTestOwnBody(scenePoint, node) ? node.id : null;
}

function hitTestOwnBody(scenePoint: Point, node: SceneNode): boolean {
  const { x, y } = scenePoint;

  switch (node.type) {
    case "rect":
      if (node.fill) return scratchCtx.isPointInPath(buildRectGeometry(node), x, y);
      if (node.stroke) return strokeHit(buildRectGeometry(node), node.strokeWidth, x, y);
      return false;
    case "ellipse":
      if (node.fill) return scratchCtx.isPointInPath(buildEllipseGeometry(node), x, y);
      if (node.stroke) return strokeHit(buildEllipseGeometry(node), node.strokeWidth, x, y);
      return false;
    case "line":
      return strokeHit(buildLineGeometry(node), node.strokeWidth, x, y);
    case "arrow":
      return strokeHit(buildArrowGeometry(node), node.strokeWidth, x, y);
    case "path": {
      const geometry = buildPathGeometry(node);
      // A closed path reads as an enclosed region even with no explicit
      // fill color — unlike an open squiggle, which has no real "inside" —
      // so its interior is still a valid click target, not just the line.
      if ((node.fill || node.closed) && scratchCtx.isPointInPath(geometry, x, y)) return true;
      if (node.stroke) return strokeHit(geometry, node.strokeWidth, x, y);
      return false;
    }
    case "image":
    case "text":
      return scratchCtx.isPointInPath(rectBoundsPath(node), x, y);
    case "frame":
      return scratchCtx.isPointInPath(buildRectGeometry(node), x, y);
    case "section":
      // Purely organizational — no visual body, so no click target of its own.
      return false;
  }
}

function strokeHit(path: Path2D, strokeWidth: number, x: number, y: number): boolean {
  const previousLineWidth = scratchCtx.lineWidth;
  scratchCtx.lineWidth = Math.max(strokeWidth, MIN_STROKE_HIT_WIDTH);
  const hit = scratchCtx.isPointInStroke(path, x, y);
  scratchCtx.lineWidth = previousLineWidth;
  return hit;
}

function rectBoundsPath(node: { width: number; height: number }): Path2D {
  const path = new Path2D();
  path.rect(0, 0, node.width, node.height);
  return path;
}
