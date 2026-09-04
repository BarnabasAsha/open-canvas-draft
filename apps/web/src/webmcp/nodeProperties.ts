import type {
  ArrowNode,
  BaseNode,
  EllipseNode,
  FrameNode,
  ImageNode,
  LineNode,
  PathNode,
  RectNode,
  SceneNode,
  SectionNode,
  TextNode,
} from "@open-canvas/schema";

// Every field a tool call is allowed to set beyond what add_element/
// update_element already take as explicit top-level params (x/y/width/
// height/x2/y2/name) — built directly from the real node types in
// @open-canvas/schema, not guessed. id/type/parentId/children are
// deliberately never included anywhere below: those are structural, and
// a tool that let an agent set them could corrupt the graph (reparent by
// overwriting parentId, desync a container's children array, etc.).
type BaseProperties = Partial<
  Pick<
    BaseNode,
    | "rotation"
    | "opacity"
    | "visible"
    | "locked"
    | "semantics"
    | "interactions"
    | "bindings"
    | "sizingHorizontal"
    | "sizingVertical"
    | "positioning"
  >
>;

// update_element-only (add_element already takes x/y/width/height as
// explicit top-level params at creation time, per type). A node's position/
// size can change after creation too — via update_element's `properties`
// bag, not a separate top-level param, keeping that tool's input shape as
// one flat bag. Excluded from GroupProperties (bounds are derived from
// children via reconcileGroupBounds, never settable directly) and from
// Line/ArrowProperties (width/height there are derived from x/y/x2/y2, see
// LineGeometryProperties below and updateElement.ts's own recompute step).
type GeometryProperties = Partial<Pick<BaseNode, "x" | "y" | "width" | "height">>;
// x/y/x2/y2 only — not width/height directly, matching add_element's own
// line/arrow shape (buildNode derives width/height from the endpoints;
// letting a patch set them directly would desync the node's stored bbox
// from where it actually renders).
type LineGeometryProperties = Partial<Pick<LineNode, "x" | "y" | "x2" | "y2">>;

export type RectProperties = BaseProperties &
  GeometryProperties &
  Partial<Pick<RectNode, "fill" | "stroke" | "strokeWidth" | "strokeStyle" | "cornerRadius">>;
export type EllipseProperties = BaseProperties &
  GeometryProperties &
  Partial<Pick<EllipseNode, "fill" | "stroke" | "strokeWidth" | "strokeStyle">>;
export type LineProperties = BaseProperties & LineGeometryProperties & Partial<Pick<LineNode, "stroke" | "strokeWidth" | "strokeStyle">>;
export type ArrowProperties = BaseProperties &
  LineGeometryProperties &
  Partial<Pick<ArrowNode, "stroke" | "strokeWidth" | "strokeStyle" | "arrowheadSize">>;
export type TextProperties = BaseProperties &
  GeometryProperties &
  Partial<
    Pick<
      TextNode,
      | "content"
      | "fontSize"
      | "fontFamily"
      | "fontWeight"
      | "fontStyle"
      | "letterSpacing"
      | "lineHeight"
      | "textDecoration"
      | "color"
      | "align"
    >
  >;
export type FrameProperties = BaseProperties &
  GeometryProperties &
  Partial<
    Pick<
      FrameNode,
      | "fill"
      | "stroke"
      | "strokeWidth"
      | "strokeStyle"
      | "clipsContent"
      | "cornerRadius"
      | "layoutMode"
      | "direction"
      | "gap"
      | "padding"
      | "primaryAxisAlign"
      | "crossAxisAlign"
    >
  >;
export type SectionProperties = BaseProperties &
  GeometryProperties &
  Partial<Pick<SectionNode, "layoutMode" | "direction" | "gap" | "padding" | "primaryAxisAlign" | "crossAxisAlign">>;
export type ImageProperties = BaseProperties & GeometryProperties & Partial<Pick<ImageNode, "objectFit" | "filters" | "alt">>;
// Not fill/stroke/etc. of a rect (those are already Partial-optional, so
// they're not "the same" by accident) — a path's actual shape (`points`,
// `closed`) is deliberately excluded: editing bezier points via a flat
// merge isn't safe the way a scalar field patch is, and no tool this pass
// authors path geometry (add_element doesn't offer "path" as a type).
export type PathProperties = BaseProperties &
  GeometryProperties &
  Partial<Pick<PathNode, "fill" | "stroke" | "strokeWidth" | "strokeStyle">>;
// group has no type-specific fields safe for a flat patch — its bounds are
// derived from its children (reconcileGroupBounds), not settable directly,
// including geometry. Only the fields every node has.
export type GroupProperties = BaseProperties;
// Unlike group, an instance's width/height are real, already-settable
// geometry — they directly drive resolveInstance.ts's uniform scaling of
// its resolved definition, the same way dragging its resize handles
// already works.
export type InstanceProperties = BaseProperties & GeometryProperties;

// update_element doesn't know its target's type at the type-signature level
// (the node id is looked up at runtime) — every one of the per-type bags
// above is already Partial, and none of their field names collide with a
// conflicting type (strokeStyle/fill/layoutMode etc. all come from the
// same shared sub-schemas across node types), so a plain intersection is a
// fully explicit "any of these known fields" bag, not a loose unknown one.
export type UpdateElementProperties = RectProperties &
  EllipseProperties &
  LineProperties &
  ArrowProperties &
  TextProperties &
  FrameProperties &
  SectionProperties &
  ImageProperties;

// JSON Schema fragments mirroring the TS types above field-for-field —
// kept in this same file specifically so the two can't silently drift
// apart when a node type gains or loses a field.
const SEMANTICS_SCHEMA = {
  type: "object",
  description: "Overrides the HTML tag/role this node would export as (see @open-canvas/schema's DEFAULT_SEMANTIC_TAG for the default).",
  properties: {
    tag: { type: "string", description: 'An HTML tag name, e.g. "button", "nav", "h1".' },
    role: { type: "string" },
    properties: { type: "object", description: "Extra HTML attributes, e.g. { href: \"/pricing\" }." },
  },
  required: ["tag"],
} as const;

const BASE_PROPERTY_SCHEMA = {
  rotation: { type: "number", description: "Degrees." },
  opacity: { type: "number", minimum: 0, maximum: 1 },
  visible: { type: "boolean" },
  locked: { type: "boolean" },
  sizingHorizontal: { type: "string", enum: ["fixed", "hug", "fill"], description: "Only meaningful inside a flex-mode parent." },
  sizingVertical: { type: "string", enum: ["fixed", "hug", "fill"], description: "Only meaningful inside a flex-mode parent." },
  positioning: { type: "string", enum: ["flow", "absolute"] },
  semantics: SEMANTICS_SCHEMA,
} as const;

const STROKE_STYLE = { type: "string", enum: ["solid", "dashed", "dotted"] } as const;
const NULLABLE_COLOR = { type: ["string", "null"], description: 'A CSS color, or null for "none".' } as const;
// update_element-only — see GeometryProperties/LineGeometryProperties above
// for why this is excluded from group and folded into x/y/x2/y2 (not
// width/height) for line/arrow.
const GEOMETRY_SCHEMA = {
  x: { type: "number" },
  y: { type: "number" },
  width: { type: "number" },
  height: { type: "number" },
} as const;
const LINE_GEOMETRY_SCHEMA = {
  x: { type: "number" },
  y: { type: "number" },
  x2: { type: "number" },
  y2: { type: "number" },
} as const;
const LAYOUT_FIELDS = {
  layoutMode: { type: "string", enum: ["none", "flex"] },
  direction: { type: "string", enum: ["row", "column"] },
  gap: { type: "number" },
  padding: {
    type: "object",
    properties: {
      top: { type: "number" },
      right: { type: "number" },
      bottom: { type: "number" },
      left: { type: "number" },
    },
    required: ["top", "right", "bottom", "left"],
  },
  primaryAxisAlign: { type: "string", enum: ["start", "center", "end", "spaceBetween"] },
  crossAxisAlign: { type: "string", enum: ["start", "center", "end", "stretch"] },
} as const;

export const RECT_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  fill: NULLABLE_COLOR,
  stroke: NULLABLE_COLOR,
  strokeWidth: { type: "number" },
  strokeStyle: STROKE_STYLE,
  cornerRadius: { type: "number" },
} as const;

export const ELLIPSE_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  fill: NULLABLE_COLOR,
  stroke: NULLABLE_COLOR,
  strokeWidth: { type: "number" },
  strokeStyle: STROKE_STYLE,
} as const;

export const LINE_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...LINE_GEOMETRY_SCHEMA,
  stroke: { type: "string" },
  strokeWidth: { type: "number" },
  strokeStyle: STROKE_STYLE,
} as const;

export const ARROW_PROPERTY_SCHEMA = {
  ...LINE_PROPERTY_SCHEMA,
  arrowheadSize: { type: "number" },
} as const;

export const TEXT_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  content: { type: "string" },
  fontSize: { type: "number" },
  fontFamily: { type: "string" },
  fontWeight: { type: "number", description: "e.g. 400, 500, 600, 700." },
  fontStyle: { type: "string", enum: ["normal", "italic"] },
  letterSpacing: { type: "number" },
  lineHeight: { type: "number" },
  textDecoration: { type: "string", enum: ["none", "underline", "line-through"] },
  color: { type: "string" },
  align: { type: "string", enum: ["left", "center", "right"] },
} as const;

export const FRAME_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  fill: NULLABLE_COLOR,
  stroke: NULLABLE_COLOR,
  strokeWidth: { type: "number" },
  strokeStyle: STROKE_STYLE,
  clipsContent: { type: "boolean" },
  cornerRadius: { type: "number" },
  ...LAYOUT_FIELDS,
} as const;

export const SECTION_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  ...LAYOUT_FIELDS,
} as const;

export const IMAGE_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  alt: {
    type: ["string", "null"],
    description: "Exported <img> alt text. Falls back to the node's own name when null — set this explicitly for a more descriptive alt than the layer name.",
  },
  objectFit: { type: "string", enum: ["fill", "contain", "cover"] },
  filters: {
    type: "object",
    properties: {
      blur: { type: "number", minimum: 0 },
      brightness: { type: "number", minimum: 0 },
      contrast: { type: "number", minimum: 0 },
      grayscale: { type: "number", minimum: 0, maximum: 1 },
      saturate: { type: "number", minimum: 0 },
      sepia: { type: "number", minimum: 0, maximum: 1 },
      hueRotate: { type: "number" },
    },
  },
} as const;

export const PATH_PROPERTY_SCHEMA = {
  ...BASE_PROPERTY_SCHEMA,
  ...GEOMETRY_SCHEMA,
  fill: NULLABLE_COLOR,
  stroke: NULLABLE_COLOR,
  strokeWidth: { type: "number" },
  strokeStyle: STROKE_STYLE,
} as const;

export const GROUP_PROPERTY_SCHEMA = { ...BASE_PROPERTY_SCHEMA } as const;
export const INSTANCE_PROPERTY_SCHEMA = { ...BASE_PROPERTY_SCHEMA, ...GEOMETRY_SCHEMA } as const;

// The flat union of every field above, for update_element's own schema — it
// can't declare a discriminated oneOf the way add_element does, since the
// target's type isn't part of its own input (only its id is). This is
// purely what's DOCUMENTED to the agent as possible; which of these
// actually apply to a given call is enforced separately, per the target
// node's real type, by PROPERTY_SCHEMA_BY_TYPE below.
export const ANY_PROPERTY_SCHEMA = {
  ...RECT_PROPERTY_SCHEMA,
  ...ELLIPSE_PROPERTY_SCHEMA,
  ...LINE_PROPERTY_SCHEMA,
  ...ARROW_PROPERTY_SCHEMA,
  ...TEXT_PROPERTY_SCHEMA,
  ...FRAME_PROPERTY_SCHEMA,
  ...SECTION_PROPERTY_SCHEMA,
  ...IMAGE_PROPERTY_SCHEMA,
  ...PATH_PROPERTY_SCHEMA,
} as const;

// update_element's runtime allow-list is keyed off THIS, by the target
// node's own actual type — not off ANY_PROPERTY_SCHEMA's flat union, which
// would let e.g. a rect-only `cornerRadius` silently attach itself to a
// text node. Covers all eleven SceneNode variants (not just the seven
// add_element can create), since update_element can target any node
// already on the canvas, including a group or a component instance.
export const PROPERTY_SCHEMA_BY_TYPE: Record<SceneNode["type"], Record<string, unknown>> = {
  rect: RECT_PROPERTY_SCHEMA,
  ellipse: ELLIPSE_PROPERTY_SCHEMA,
  line: LINE_PROPERTY_SCHEMA,
  arrow: ARROW_PROPERTY_SCHEMA,
  text: TEXT_PROPERTY_SCHEMA,
  frame: FRAME_PROPERTY_SCHEMA,
  section: SECTION_PROPERTY_SCHEMA,
  image: IMAGE_PROPERTY_SCHEMA,
  path: PATH_PROPERTY_SCHEMA,
  group: GROUP_PROPERTY_SCHEMA,
  instance: INSTANCE_PROPERTY_SCHEMA,
};
