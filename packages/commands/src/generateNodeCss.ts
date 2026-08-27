import type {
  ArrowNode,
  CrossAxisAlign,
  FrameNode,
  LineNode,
  PrimaryAxisAlign,
  SceneNode,
  SectionNode,
  SizingMode,
} from "@open-canvas/schema";
import { buildCssFilterString, isNeutralFilters } from "./imageFilters";

// Pure derivation from whatever's already stored on the node — no new
// state, no schema changes. Always includes every property applicable to
// the node's type (matching how a real inspector panel reads, rather than
// only showing non-default values), except the one property that IS
// default-suppressed: `filter`, omitted when every filter is neutral,
// mirroring drawImage.ts's own skip-when-neutral behavior exactly (both
// share buildCssFilterString/isNeutralFilters so they can never disagree).
// Output is grouped into blank-line-separated blocks (size, appearance,
// layout, typography, filter) rather than one flat list — easier to scan
// once a node has more than three or four properties.
export function generateNodeCss(node: SceneNode, parentNode: SceneNode | null): string {
  if (node.type === "line" || node.type === "arrow") return generateLineCss(node);

  const groups: string[][] = [[...sizeLines(node, parentNode), `opacity: ${node.opacity};`]];

  const appearance: string[] = [];
  if (hasFill(node) && node.fill) appearance.push(`background: ${node.fill};`);
  if (hasStroke(node) && node.stroke) appearance.push(`border: ${node.strokeWidth}px ${node.strokeStyle} ${node.stroke};`);
  if (hasCornerRadius(node)) appearance.push(`border-radius: ${node.cornerRadius}px;`);
  if (appearance.length > 0) groups.push(appearance);

  if (isFlexContainer(node)) {
    groups.push([
      "display: flex;",
      `flex-direction: ${node.direction};`,
      `gap: ${node.gap}px;`,
      `padding: ${node.padding.top}px ${node.padding.right}px ${node.padding.bottom}px ${node.padding.left}px;`,
      `justify-content: ${cssJustifyContent(node.primaryAxisAlign)};`,
      `align-items: ${cssAlignItems(node.crossAxisAlign)};`,
    ]);
  }

  if (node.type === "text") {
    groups.push([
      `font-family: ${node.fontFamily};`,
      `font-size: ${node.fontSize}px;`,
      `font-weight: ${node.fontWeight};`,
      `font-style: ${node.fontStyle};`,
      `line-height: ${node.lineHeight};`,
      `letter-spacing: ${node.letterSpacing}px;`,
      `text-decoration: ${node.textDecoration};`,
      `text-align: ${node.align};`,
      `color: ${node.color};`,
    ]);
  }

  if (node.type === "image" && !isNeutralFilters(node.filters)) {
    groups.push([`filter: ${buildCssFilterString(node.filters)};`]);
  }

  return groups.map((group) => group.join("\n")).join("\n\n");
}

// A line/arrow's real geometry is x/y/x2/y2, not width/height — the
// standard "long thin rotated box" CSS technique (zero-height div, a
// border for the stroke, rotated around its own top-left corner) is the
// only reasonable single-element representation. Arrowheads have no
// direct CSS equivalent (they'd need a generated pseudo-element
// triangle) — arrow renders identically to line here, shaft only, a
// named v1 scope limit rather than an attempt at full fidelity.
function generateLineCss(node: LineNode | ArrowNode): string {
  const dx = node.x2 - node.x;
  const dy = node.y2 - node.y;
  // Rounded to 2 decimal places — unlike a directly-stored field (e.g.
  // lineHeight, shown at full precision elsewhere in this file), length
  // and angle are DERIVED from x/y/x2/y2, and floating-point trig
  // routinely produces 15+ meaningless digits no CSS tool would emit.
  const length = round2(Math.hypot(dx, dy));
  const angleDeg = round2((Math.atan2(dy, dx) * 180) / Math.PI);

  return [
    `width: ${length}px;`,
    "height: 0px;",
    `border-bottom: ${node.strokeWidth}px ${node.strokeStyle} ${node.stroke};`,
    `transform: rotate(${angleDeg}deg);`,
    "transform-origin: 0 0;",
    `opacity: ${node.opacity};`,
  ].join("\n");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isFlexContainer(node: SceneNode): node is FrameNode | SectionNode {
  return (node.type === "frame" || node.type === "section") && node.layoutMode === "flex";
}

// A flow child of a flex container translates its own per-axis sizing
// mode into the CSS idiom for whichever role that axis actually plays —
// "fill" means flex-grow on the main axis but align-self:stretch on the
// cross axis, since those are genuinely different CSS mechanisms, not
// interchangeable. A node with no flex parent (or an absolutely-
// positioned flow child) just gets its stored width/height directly.
function sizeLines(node: SceneNode, parentNode: SceneNode | null): string[] {
  if (!parentNode || !isFlexContainer(parentNode) || node.positioning === "absolute") {
    return [`width: ${node.width}px;`, `height: ${node.height}px;`];
  }

  const isRow = parentNode.direction === "row";
  const { crossAxisAlign } = parentNode;
  return [
    ...sizeLine("width", node.sizingHorizontal, node.width, isRow ? "main" : "cross", crossAxisAlign),
    ...sizeLine("height", node.sizingVertical, node.height, isRow ? "cross" : "main", crossAxisAlign),
  ];
}

// "hug" on the cross axis defers to the container's own
// crossAxisAlign:"stretch" the same way flexLayout.ts's resolveCrossSize
// does — an explicit fit-content there would silently defeat a real
// browser's stretch, diverging from what's actually rendered. "fixed"/
// "hug" on the MAIN axis both get an explicit flex-shrink:0 alongside
// their size, matching this app's own layout model (those children never
// shrink under space pressure — a flex container just overflows instead,
// per flexLayout.ts's clamped-to-zero leftover); flex-shrink has no
// effect on the cross axis, so it's only ever emitted here.
function sizeLine(
  prop: "width" | "height",
  sizing: SizingMode,
  value: number,
  axisRole: "main" | "cross",
  crossAxisAlign: CrossAxisAlign,
): string[] {
  if (sizing === "fill") return [axisRole === "main" ? "flex: 1 1 0;" : "align-self: stretch;"];
  if (sizing === "hug" && axisRole === "cross" && crossAxisAlign === "stretch") return ["align-self: stretch;"];

  const sizeDecl = sizing === "hug" ? `${prop}: fit-content;` : `${prop}: ${value}px;`;
  return axisRole === "main" ? [sizeDecl, "flex-shrink: 0;"] : [sizeDecl];
}

function cssJustifyContent(align: PrimaryAxisAlign): string {
  if (align === "start") return "flex-start";
  if (align === "end") return "flex-end";
  if (align === "spaceBetween") return "space-between";
  return "center";
}

function cssAlignItems(align: CrossAxisAlign): string {
  if (align === "start") return "flex-start";
  if (align === "end") return "flex-end";
  return align;
}

type FillNode = Extract<SceneNode, { fill: string | null }>;
type StrokeNode = Extract<SceneNode, { stroke: string | null } | { stroke: string }>;
type CornerRadiusNode = Extract<SceneNode, { cornerRadius: number }>;

function hasFill(node: SceneNode): node is FillNode {
  return "fill" in node;
}

function hasStroke(node: SceneNode): node is StrokeNode {
  return "stroke" in node;
}

function hasCornerRadius(node: SceneNode): node is CornerRadiusNode {
  return "cornerRadius" in node;
}
