import type { NodeId, SceneNode } from "../../types/scene";
import { buildArrowGeometry, drawArrow } from "./shapes/drawArrow";
import { buildEllipseGeometry, drawEllipse } from "./shapes/drawEllipse";
import { drawFrame } from "./shapes/drawFrame";
import { drawGroup } from "./shapes/drawGroup";
import { drawImage } from "./shapes/drawImage";
import { drawInstance } from "./shapes/drawInstance";
import { buildLineGeometry, drawLine } from "./shapes/drawLine";
import { buildPathGeometry, drawPath } from "./shapes/drawPath";
import { buildRectGeometry, drawRect } from "./shapes/drawRect";
import { rectBoundsPath, strokeHit } from "./shapes/rectBounds";
import { drawSection } from "./shapes/drawSection";
import { drawText } from "./shapes/drawText";

type Nodes = Record<NodeId, SceneNode>;

interface NodeKind<T extends SceneNode> {
  draw: (ctx: CanvasRenderingContext2D, node: T, nodes: Nodes) => void;
  hitTestOwnBody: (ctx: CanvasRenderingContext2D, node: T, x: number, y: number) => boolean;
}

// A mapped type over the discriminant, not Record<SceneNode["type"], ...> —
// this is what makes the object literal below exhaustive: TypeScript
// requires every key of SceneNode["type"] to be present, so adding a new
// SceneNode variant without a matching entry here is a compile error,
// unlike the switch statements this replaces (drawNode.ts/hitTest.ts used
// to silently no-op on a missing case).
type NodeKindTable = {
  [K in SceneNode["type"]]: NodeKind<Extract<SceneNode, { type: K }>>;
};

// Shared by rect/ellipse: filled shapes are hit by their filled area,
// unfilled-but-stroked shapes by their outline only — mirrors the exact
// logic hitTest.ts used to inline per case.
function fillOrStrokeHit(
  ctx: CanvasRenderingContext2D,
  geometry: Path2D,
  node: { fill: string | null; stroke: string | null; strokeWidth: number },
  x: number,
  y: number,
): boolean {
  if (node.fill) return ctx.isPointInPath(geometry, x, y);
  if (node.stroke) return strokeHit(ctx, geometry, node.strokeWidth, x, y);
  return false;
}

export const nodeKinds: NodeKindTable = {
  rect: {
    draw: drawRect,
    hitTestOwnBody: (ctx, node, x, y) => fillOrStrokeHit(ctx, buildRectGeometry(node), node, x, y),
  },
  ellipse: {
    draw: drawEllipse,
    hitTestOwnBody: (ctx, node, x, y) => fillOrStrokeHit(ctx, buildEllipseGeometry(node), node, x, y),
  },
  line: {
    draw: drawLine,
    hitTestOwnBody: (ctx, node, x, y) => strokeHit(ctx, buildLineGeometry(node), node.strokeWidth, x, y),
  },
  arrow: {
    draw: drawArrow,
    hitTestOwnBody: (ctx, node, x, y) => strokeHit(ctx, buildArrowGeometry(node), node.strokeWidth, x, y),
  },
  image: {
    draw: drawImage,
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(rectBoundsPath(node), x, y),
  },
  text: {
    draw: drawText,
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(rectBoundsPath(node), x, y),
  },
  path: {
    draw: drawPath,
    hitTestOwnBody: (ctx, node, x, y) => {
      const geometry = buildPathGeometry(node);
      // A closed path reads as an enclosed region even with no explicit
      // fill color — unlike an open squiggle, which has no real "inside".
      if ((node.fill || node.closed) && ctx.isPointInPath(geometry, x, y)) return true;
      if (node.stroke) return strokeHit(ctx, geometry, node.strokeWidth, x, y);
      return false;
    },
  },
  frame: {
    draw: drawFrame,
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(buildRectGeometry(node), x, y),
  },
  section: {
    draw: drawSection,
    // No fill, but its bbox is still a real click target — same as a
    // frame's body, just always invisible.
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(rectBoundsPath(node), x, y),
  },
  group: {
    draw: drawGroup,
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(rectBoundsPath(node), x, y),
  },
  // A leaf, not a container, for the SAME live scene graph — clicking
  // anywhere inside an instance selects the instance as a whole; its
  // resolved children aren't real reparentable graph nodes. Browsing into
  // one and editing a child's own fields (via an override) is a separate,
  // already-built path — see LayerItem.tsx's InstanceChildRow rendering
  // and useInstanceOverrideEdit.ts, not this hit-test dispatch.
  instance: {
    draw: drawInstance,
    hitTestOwnBody: (ctx, node, x, y) => ctx.isPointInPath(rectBoundsPath(node), x, y),
  },
};
