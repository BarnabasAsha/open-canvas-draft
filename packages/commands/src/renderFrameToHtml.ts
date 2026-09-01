import type { ComponentId, FrameNode, NodeId, SceneNode } from "@open-canvas/schema";
import type { ComponentDefinition } from "./componentTypes";
import { generateNodeCss } from "./generateNodeCss";
import { buildGoogleFontsUrl, GOOGLE_FONTS } from "./googleFonts";
import { escapeHtml, nodeToHtmlElement } from "./nodeToHtmlElement";
import { resolveInstance } from "./resolveInstance";

const GOOGLE_FONT_SET: ReadonlySet<string> = new Set(GOOGLE_FONTS);

// One CSS class per rendered node, named by render order rather than the
// node's own id — ids (especially virtual instance-child ids from
// instanceVirtualId.ts) aren't guaranteed to be valid unescaped CSS
// identifiers, and a plain counter sidesteps that entirely.
class ClassAllocator {
  private next = 0;
  private readonly rules: string[] = [];

  declare(declarations: string[]): string {
    const className = `n${this.next++}`;
    this.rules.push(`.${className} {\n${declarations.join("\n")}\n}`);
    return className;
  }

  get css(): string {
    return this.rules.join("\n\n");
  }
}

function isContainer(node: SceneNode): node is Extract<SceneNode, { children: NodeId[] }> {
  return node.type === "frame" || node.type === "section" || node.type === "group";
}

// Whether a node needs to be a CSS containing block for its own children's
// absolute positioning — every real container, plus an instance (its
// "children" are the resolved definition subtree, not a `children` field,
// so it fails isContainer's own check but still needs the same anchor).
function needsAnchor(node: SceneNode): boolean {
  return isContainer(node) || node.type === "instance";
}

// A container's flex-flowed children are fully placed by the flex CSS
// generateNodeCss already emits on the container; anything else (a flow
// child of a non-flex container, or a positioning:"absolute" child
// anywhere) keeps the exact free x/y this app already stores it in —
// no world-matrix flattening needed, since nested position:relative
// containers compose the same way nested Canvas 2D transforms already do.
// `position` only ever takes one value per element, so the two concerns
// here (this node's OWN placement vs. it being an anchor for its
// children) are deliberately mutually exclusive, not additive:
// position:absolute already establishes a containing block for its own
// descendants too, so a node that needs absolute placement never also
// needs position:relative on top of it.
function positionCss(node: SceneNode, parentNode: SceneNode | null, isDocumentRoot: boolean): string[] {
  if (isDocumentRoot) return ["position: relative;"];

  const declarations: string[] = [];
  const parentIsFlex = parentNode && (parentNode.type === "frame" || parentNode.type === "section") && parentNode.layoutMode === "flex";
  if (!parentIsFlex || node.positioning === "absolute") {
    declarations.push("position: absolute;", `left: ${node.x}px;`, `top: ${node.y}px;`);
  } else if (needsAnchor(node)) {
    declarations.push("position: relative;");
  }

  // line/arrow already carry their own transform (the rotated-shaft
  // technique in generateNodeCss's generateLineCss) — adding another here
  // would compose incorrectly with it.
  if (node.type !== "line" && node.type !== "arrow" && node.rotation !== 0) {
    declarations.push(`transform: rotate(${node.rotation}deg);`);
  }

  return declarations;
}

// generateNodeCss treats any `fill`/`stroke` field as a rectangular
// background/border — correct for every fillable/strokeable type except
// path, whose real shape is a bezier curve rendered via its own SVG <path>
// attributes (see nodeToHtmlElement.ts). Strip the lines that would
// otherwise paint a wrong solid rectangle behind/around the actual shape.
function nodeOwnCss(node: SceneNode, parentNode: SceneNode | null): string {
  const css = generateNodeCss(node, parentNode);
  if (node.type !== "path") return css;
  return css
    .split("\n")
    .filter((line) => !line.startsWith("background:") && !line.startsWith("border:"))
    .join("\n");
}

function attrsToHtml(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join("");
}

// nodeToHtmlElement.ts only ever emits "img" itself, but semantics.tag is
// free-form (any node can be authored with e.g. tag:"hr" or tag:"input") —
// the full HTML void-element list, so any of those self-close correctly
// too rather than relying on browsers' tolerance for a stray closing tag.
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

function semanticsAttrs(node: SceneNode): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (node.semantics?.role) attrs.role = node.semantics.role;
  for (const [key, value] of Object.entries(node.semantics?.properties ?? {})) attrs[key] = String(value);
  return attrs;
}

interface RenderContext {
  nodes: Record<NodeId, SceneNode>;
  components: Record<ComponentId, ComponentDefinition>;
  classes: ClassAllocator;
  fontFamilies: Set<string>;
}

function renderNode(node: SceneNode, parentNode: SceneNode | null, ctx: RenderContext, isDocumentRoot: boolean): string {
  if (node.type === "instance") return renderInstance(node, parentNode, ctx);

  if (node.type === "text") ctx.fontFamilies.add(node.fontFamily);

  const spec = nodeToHtmlElement[node.type](node as never);
  const className = ctx.classes.declare([nodeOwnCss(node, parentNode), ...spec.extraCss, ...positionCss(node, parentNode, isDocumentRoot)]);
  const attrs = { class: className, ...spec.attrs, ...semanticsAttrs(node) };

  if (VOID_ELEMENTS.has(spec.tag)) return `<${spec.tag}${attrsToHtml(attrs)}>`;

  const inner = isContainer(node)
    ? node.children.map((childId) => renderChild(childId, node, ctx)).join("\n")
    : (spec.innerHtml ?? "");

  return `<${spec.tag}${attrsToHtml(attrs)}>${inner}</${spec.tag}>`;
}

function renderChild(childId: NodeId, parentNode: SceneNode, ctx: RenderContext): string {
  const child = ctx.nodes[childId];
  if (!child) return "";
  return renderNode(child, parentNode, ctx, false);
}

// An instance has no visual identity of its own — it disappears into its
// resolved definition's root, exactly as resolveInstance.ts's own doc
// comment anticipated. The wrapper here carries the instance's own
// position/rotation/size; the resolved root then overlays it exactly
// (resolveInstance's placeRoot already zeroes the resolved root's x/y/
// rotation and sizes it to the instance's own width/height).
function renderInstance(
  node: Extract<SceneNode, { type: "instance" }>,
  parentNode: SceneNode | null,
  ctx: RenderContext,
): string {
  const definition = ctx.components[node.componentId];
  if (!definition) return `<!-- missing component definition for ${escapeHtml(node.componentId)} -->`;

  const wrapperClass = ctx.classes.declare([generateNodeCss(node, parentNode), ...positionCss(node, parentNode, false)]);
  const resolved = resolveInstance(node, definition);
  const resolvedRoot = resolved.nodes[resolved.rootId];
  const inner = renderNode(resolvedRoot, null, { ...ctx, nodes: resolved.nodes }, false);

  return `<div class="${wrapperClass}">${inner}</div>`;
}

// Renders a single Frame (and everything nested inside it) into a complete,
// self-contained HTML document — a downloadable file, not a fragment.
// `components` only needs to cover whatever componentIds the frame's
// instance nodes actually reference; component definitions live purely
// client-side today (componentsStore.ts), so the caller supplies whatever
// it already has in memory rather than this needing its own persistence.
export function renderFrameToHtml(
  frameId: NodeId,
  nodes: Record<NodeId, SceneNode>,
  components: Record<ComponentId, ComponentDefinition>,
): string {
  const frame = nodes[frameId];
  if (!frame || frame.type !== "frame") {
    throw new Error(`Node ${frameId} is not a frame`);
  }

  const ctx: RenderContext = { nodes, components, classes: new ClassAllocator(), fontFamilies: new Set() };
  const body = renderNode(frame, null, ctx, true);

  const usedGoogleFonts = [...ctx.fontFamilies].filter((family) => GOOGLE_FONT_SET.has(family));
  const fontLink = buildGoogleFontsUrl(usedGoogleFonts);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(frame.name)}</title>`,
    fontLink ? `<link rel="stylesheet" href="${fontLink}">` : "",
    // The frame's own width/height is already the literal pixel size
    // authored on the canvas (a fixed-size artboard, not a fluid
    // container) — this only strips the browser's own default margins/box
    // model, which would otherwise add extra spacing on top of that rather
    // than actually making the page responsive. Margin is reset on every
    // element, not just body: every node's own spacing is already fully
    // explicit (gap/padding/position), so a UA default margin on whatever
    // element a node resolves to — most commonly <p> for text, but
    // semantics.tag can be authored as any tag — would only ever add
    // unwanted extra space, never a wanted one. (Caught exactly this: a
    // text node's default tag became <p> once DEFAULT_SEMANTIC_TAG shipped,
    // and its default 1em margin pushed it outside its parent's bounds.)
    "<style>\n* { margin: 0; box-sizing: border-box; }\n</style>",
    `<style>\n${ctx.classes.css}\n</style>`,
    "</head>",
    `<body>\n${body}\n</body>`,
    "</html>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function frameExportFileName(frame: FrameNode): string {
  const slug = frame.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "frame"}.html`;
}
