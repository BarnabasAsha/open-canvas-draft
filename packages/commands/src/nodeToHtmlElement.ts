import type {
  ArrowNode,
  EllipseNode,
  FrameNode,
  GroupNode,
  ImageNode,
  LineNode,
  PathNode,
  PathPoint,
  RectNode,
  SceneNode,
  SectionNode,
  TextNode,
} from "@open-canvas/schema";
import { resolveSemanticTag } from "@open-canvas/schema";

export interface HtmlElementSpec {
  tag: string;
  attrs: Record<string, string>;
  // CSS declarations beyond what generateNodeCss already covers for this
  // node — appearance details generateNodeCss has no branch for (an
  // ellipse's roundness, an image's object-fit, a frame's content
  // clipping), never geometry/position (that's applied uniformly by the
  // caller for every node, not per-type).
  extraCss: string[];
  // Leaf content only (text, or a path's inline SVG markup) — containers
  // get their children appended by the caller, which is the only thing
  // that needs to recurse through the (possibly instance-resolved) node
  // map.
  innerHtml?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Mirrors tracePathSegment in apps/web/src/canvas/renderer/shapes/drawPath.ts
// exactly (same handle semantics: handleOut/handleIn are absolute control-
// point positions, a curve segment exists only when either endpoint defines
// one) — translated to SVG path commands instead of Path2D calls, since
// Path2D is as browser-only as the DOMMatrix/DOMPoint APIs this exporter is
// deliberately built to avoid needing server-side.
function buildPathD(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) return "";

  const segment = (from: PathPoint, to: PathPoint): string => {
    if (from.handleOut || to.handleIn) {
      const c1 = from.handleOut ?? from;
      const c2 = to.handleIn ?? to;
      return `C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
    }
    return `L ${to.x} ${to.y}`;
  };

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) commands.push(segment(points[i - 1], points[i]));
  if (closed) {
    commands.push(segment(points[points.length - 1], points[0]));
    commands.push("Z");
  }
  return commands.join(" ");
}

// One entry per SceneNode variant except "instance" — an instance has no
// visual identity of its own (it disappears into its resolved definition's
// root), so renderFrameToHtml.ts special-cases it before ever consulting
// this table, the same way it's the one type nodeKinds.ts's own draw table
// still has to handle specially via drawInstance rather than a shared shape
// primitive.
type ContainerLike = FrameNode | SectionNode | GroupNode;

function containerElement(node: ContainerLike): HtmlElementSpec {
  const extraCss = node.type === "frame" && node.clipsContent ? ["overflow: hidden;"] : [];
  return { tag: resolveSemanticTag(node), attrs: {}, extraCss };
}

// A mapped type over the discriminant, not a plain object literal type —
// same reasoning as nodeKinds.ts's own NodeKindTable: TypeScript requires
// every key of Exclude<SceneNode["type"], "instance"> to be present below,
// so a new SceneNode variant without a matching entry here is a compile
// error rather than a silent gap in export coverage.
type NodeHtmlTable = {
  [K in Exclude<SceneNode["type"], "instance">]: (node: Extract<SceneNode, { type: K }>) => HtmlElementSpec;
};

export const nodeToHtmlElement: NodeHtmlTable = {
  rect: (node: RectNode): HtmlElementSpec => ({ tag: resolveSemanticTag(node), attrs: {}, extraCss: [] }),
  ellipse: (node: EllipseNode): HtmlElementSpec => ({
    tag: resolveSemanticTag(node),
    attrs: {},
    extraCss: ["border-radius: 50%;"],
  }),
  // generateNodeCss already renders line/arrow as a full rotated, bordered
  // shaft (see its own generateLineCss) — arrows have no arrowhead yet
  // (documented there as a named v1 scope limit), so both need nothing
  // beyond that.
  line: (node: LineNode): HtmlElementSpec => ({ tag: resolveSemanticTag(node), attrs: {}, extraCss: [] }),
  arrow: (node: ArrowNode): HtmlElementSpec => ({ tag: resolveSemanticTag(node), attrs: {}, extraCss: [] }),
  image: (node: ImageNode): HtmlElementSpec => ({
    tag: resolveSemanticTag(node),
    attrs: { src: node.src, alt: escapeHtml(node.name) },
    extraCss: [`object-fit: ${node.objectFit};`],
  }),
  text: (node: TextNode): HtmlElementSpec => ({
    tag: resolveSemanticTag(node),
    attrs: {},
    extraCss: [],
    innerHtml: escapeHtml(node.content),
  }),
  // The one node type generateNodeCss can't express as CSS at all — its
  // fill/stroke would render as if the node were a plain rectangle, not the
  // actual bezier shape. Rendered as its own inline SVG instead of a div.
  path: (node: PathNode): HtmlElementSpec => {
    const d = buildPathD(node.points, node.closed);
    const fill = node.fill ?? "none";
    const stroke = node.stroke ?? "none";
    return {
      tag: "svg",
      attrs: { viewBox: `0 0 ${node.width} ${node.height}` },
      extraCss: [],
      innerHtml: `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${node.strokeWidth}"/>`,
    };
  },
  frame: containerElement,
  section: containerElement,
  group: containerElement,
};
