import type {
  ArrowNode,
  EllipseNode,
  FrameNode,
  GroupNode,
  ImageNode,
  LineNode,
  PathNode,
  PathPoint,
  PathSubpath,
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

const UNSPLASH_IMAGE_HOST = "images.unsplash.com";
const UNSPLASH_RESPONSIVE_WIDTHS = [640, 1080, 1920];

// Unsplash's image URLs are served through an image-resizing service that
// honors a `w` query param on any of their hosted URLs — a real responsive
// srcset is just a few width variants of the SAME url, no separate stored
// sizes needed. An uploaded asset's src won't match this host, so it falls
// through to null (no <source>, just the plain fallback <img> — see the
// image case above).
function buildUnsplashResponsiveSrcset(src: string): string | null {
  let base: URL;
  try {
    base = new URL(src);
  } catch {
    return null;
  }
  if (base.hostname !== UNSPLASH_IMAGE_HOST) return null;

  return UNSPLASH_RESPONSIVE_WIDTHS.map((width) => {
    const variant = new URL(base);
    variant.searchParams.set("w", String(width));
    return `${variant.toString()} ${width}w`;
  }).join(", ");
}

// Mirrors tracePathSegment in apps/web/src/canvas/renderer/shapes/drawPath.ts
// exactly (same handle semantics: handleOut/handleIn are absolute control-
// point positions, a curve segment exists only when either endpoint defines
// one) — translated to SVG path commands instead of Path2D calls, since
// Path2D is as browser-only as the DOMMatrix/DOMPoint APIs this exporter is
// deliberately built to avoid needing server-side.
function buildSubpathD(points: PathPoint[], closed: boolean): string {
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

// One node, one fill/stroke, but possibly several independent subpaths —
// concatenating each subpath's own "M ... Z" sequence into one `d` string is
// exactly how SVG represents a compound shape (e.g. a ring, via two
// oppositely-wound subpaths and fill-rule) natively, no extra markup needed.
function buildPathD(subpaths: PathSubpath[]): string {
  return subpaths.map((subpath) => buildSubpathD(subpath.points, subpath.closed)).join(" ");
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
  image: (node: ImageNode): HtmlElementSpec => {
    const tag = resolveSemanticTag(node);
    const objectFitCss = `object-fit: ${node.objectFit};`;

    // attrsToHtml (renderFrameToHtml.ts) already escapes every attrs value
    // itself — node.name went through escapeHtml here too, double-escaping
    // it (e.g. an apostrophe became &amp;#39; instead of &#39;).
    if (tag !== "picture") {
      return { tag, attrs: { src: node.src, alt: node.name }, extraCss: [objectFitCss] };
    }

    // object-fit only has an effect on a replaced element (img/video), not
    // on <picture> itself, so it moves from extraCss (which the caller
    // applies to whichever tag ends up outermost) onto the inner <img>'s
    // own inline style — width/height/position stay on the outer <picture>
    // via the normal generateNodeCss/extraCss path, unaffected by this.
    const srcset = buildUnsplashResponsiveSrcset(node.src);
    const source = srcset ? `<source srcset="${srcset}" sizes="100vw">` : "";
    const img = `<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.name)}" style="display: block; width: 100%; height: 100%; ${objectFitCss}">`;
    return { tag: "picture", attrs: {}, extraCss: [], innerHtml: `${source}${img}` };
  },
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
    const d = buildPathD(node.subpaths);
    const fill = node.fill ?? "none";
    const stroke = node.stroke ?? "none";
    const fillRuleAttr = node.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
    return {
      tag: "svg",
      attrs: { viewBox: `0 0 ${node.width} ${node.height}` },
      extraCss: [],
      innerHtml: `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${node.strokeWidth}"${fillRuleAttr}/>`,
    };
  },
  frame: containerElement,
  section: containerElement,
  group: containerElement,
};
