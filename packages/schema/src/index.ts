import { z } from "zod";

export const NodeIdSchema = z.string();
export type NodeId = z.infer<typeof NodeIdSchema>;

export const VariableIdSchema = z.string();
export type VariableId = z.infer<typeof VariableIdSchema>;

export const ComponentIdSchema = z.string();
export type ComponentId = z.infer<typeof ComponentIdSchema>;

// `keyof HTMLElementTagNameMap` has no runtime representation Zod can check
// against without enumerating every HTML tag name. Validate loosely as a
// string at the schema layer; keep the precise literal union at the type
// layer, since call sites in this codebase (e.g. builtInComponents.ts)
// rely on it to catch typos like `tag: "buton"` at compile time.
export const SemanticsSchema = z.object({
  tag: z.string(),
  role: z.string().optional(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});
export type SemanticTag = keyof HTMLElementTagNameMap;
export interface Semantics extends Omit<
  z.infer<typeof SemanticsSchema>,
  "tag"
> {
  tag: SemanticTag;
}

// Every node schema below spreads `baseNodeShape`, so its z.infer carries
// the loose `SemanticsSchema`-inferred `semantics` field. Re-narrow it to
// the precise `Semantics` type on each concrete node's exported type,
// rather than just on BaseNode, so `node.semantics` type-checks against
// `Semantics` everywhere a discriminated SceneNode variant is used.
type RefineSemantics<T extends { semantics: unknown }> = Omit<
  T,
  "semantics"
> & {
  semantics: Semantics | null;
};

export const VariableTypeSchema = z.enum(["boolean", "number", "string"]);
export type VariableType = z.infer<typeof VariableTypeSchema>;

export const VariableSchema = z.object({
  id: VariableIdSchema,
  name: z.string(),
  type: VariableTypeSchema,
  defaultValue: z.union([z.boolean(), z.number(), z.string()]),
});
export type Variable = z.infer<typeof VariableSchema>;

export const TransitionTypeSchema = z.enum([
  "instant",
  "slide",
  "dissolve",
  "push",
  "smartAnimate",
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export const InteractionActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("setVariable"),
    variableId: VariableIdSchema,
    value: z.union([z.boolean(), z.number(), z.string()]),
  }),
  z.object({
    type: z.literal("toggleVariable"),
    variableId: VariableIdSchema,
  }),
  z.object({
    type: z.literal("incrementVariable"),
    variableId: VariableIdSchema,
    by: z.number(),
  }),
  z.object({
    type: z.literal("navigate"),
    targetNodeId: NodeIdSchema,
    transition: TransitionTypeSchema.optional(),
  }),
]);
export type InteractionAction = z.infer<typeof InteractionActionSchema>;

export const InteractionSchema = z.discriminatedUnion("trigger", [
  z.object({
    trigger: z.literal("click"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("hoverStart"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("hoverEnd"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("pressStart"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("pressEnd"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("focus"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("blur"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("change"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("keyPress"),
    key: z.string(),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("load"),
    actions: z.array(InteractionActionSchema),
  }),
  z.object({
    trigger: z.literal("afterDelay"),
    delayMs: z.number(),
    actions: z.array(InteractionActionSchema),
  }),
]);
export type Interaction = z.infer<typeof InteractionSchema>;

// Kept as its own type rather than inlining the union everywhere, since
// every stroke-bearing node type below repeats it.
export const StrokeStyleSchema = z.enum(["solid", "dashed", "dotted"]);
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;

// Sizing/positioning for a node that happens to be a child of a
// layoutMode:"flex" container (see FrameNodeSchema/SectionNodeSchema
// below). Kept on every node, not just container children, since any
// node could end up inside a flex container — same reasoning as
// `semantics`/`interactions` already being BaseNode-level fields.
export const SizingModeSchema = z.enum(["fixed", "hug", "fill"]);
export type SizingMode = z.infer<typeof SizingModeSchema>;

// "absolute" opts a flex child out of layout entirely — it keeps today's
// exact free x/y positioning (relative to the container's own local
// origin), ignored by both the flex measure and place passes. The escape
// hatch for e.g. a badge overlapping a card corner without forcing the
// whole card into fighting the layout system.
export const PositioningModeSchema = z.enum(["flow", "absolute"]);
export type PositioningMode = z.infer<typeof PositioningModeSchema>;

const baseNodeShape = {
  id: NodeIdSchema,
  name: z.string(),
  parentId: NodeIdSchema.nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  visible: z.boolean(),
  locked: z.boolean(),
  semantics: SemanticsSchema.nullable(),
  interactions: z.array(InteractionSchema),
  bindings: z.record(z.string(), VariableIdSchema).optional(),
  sizingHorizontal: SizingModeSchema,
  sizingVertical: SizingModeSchema,
  positioning: PositioningModeSchema,
};

export const BaseNodeSchema = z.object(baseNodeShape);
export type BaseNode = RefineSemantics<z.infer<typeof BaseNodeSchema>> & {
  type: string;
};

export const RectNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("rect"),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
  cornerRadius: z.number(),
});
export type RectNode = RefineSemantics<z.infer<typeof RectNodeSchema>>;

export const EllipseNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("ellipse"),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
});
export type EllipseNode = RefineSemantics<z.infer<typeof EllipseNodeSchema>>;

export const LineNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("line"),
  x2: z.number(),
  y2: z.number(),
  stroke: z.string(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
});
export type LineNode = RefineSemantics<z.infer<typeof LineNodeSchema>>;

export const ArrowNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("arrow"),
  x2: z.number(),
  y2: z.number(),
  stroke: z.string(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
  arrowheadSize: z.number(),
});
export type ArrowNode = RefineSemantics<z.infer<typeof ArrowNodeSchema>>;

// Values match the units the CSS `filter` functions themselves take
// (blur in px, brightness/contrast/saturate as a unitless multiplier
// where 1 is neutral, grayscale/sepia as a 0-1 fraction, hueRotate in
// degrees) — a neutral ImageFilters is blur:0, brightness/contrast/
// saturate:1, grayscale/sepia:0, hueRotate:0. Storing the spec's own
// units means both the renderer (ctx.filter) and the CSS inspector can
// format these directly with no conversion layer.
export const ImageFiltersSchema = z.object({
  blur: z.number(),
  brightness: z.number(),
  contrast: z.number(),
  grayscale: z.number(),
  saturate: z.number(),
  sepia: z.number(),
  hueRotate: z.number(),
});
export type ImageFilters = z.infer<typeof ImageFiltersSchema>;

export const ImageNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("image"),
  src: z.string(),
  // Optional, distinct from `name` — the exported alt attribute falls back
  // to `name` when this is null (nodeToHtmlElement.ts), which is fine for
  // an already-descriptive name (e.g. an Unsplash insert's "Photo by X on
  // Unsplash") but weak for a plain upload's generic default ("Image 1").
  // This gives an explicit way to set real alt text without renaming the
  // layer to match.
  alt: z.string().nullable(),
  objectFit: z.enum(["fill", "contain", "cover"]),
  filters: ImageFiltersSchema,
});
export type ImageNode = RefineSemantics<z.infer<typeof ImageNodeSchema>>;

export const TextNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("text"),
  content: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  fontWeight: z.number(),
  fontStyle: z.enum(["normal", "italic"]),
  letterSpacing: z.number(),
  lineHeight: z.number(),
  textDecoration: z.enum(["none", "underline", "line-through"]),
  color: z.string(),
  align: z.enum(["left", "center", "right"]),
});
export type TextNode = RefineSemantics<z.infer<typeof TextNodeSchema>>;

export const PathPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  handleIn: z.object({ x: z.number(), y: z.number() }).optional(),
  handleOut: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type PathPoint = z.infer<typeof PathPointSchema>;

// A path node is one or more independent subpaths sharing one fill/stroke —
// most real vector icons are built this way (an outer shape plus a smaller
// inner one, forming a "hole" via fillRule), not the single continuous loop
// this schema originally modeled.
export const PathSubpathSchema = z.object({
  points: z.array(PathPointSchema),
  closed: z.boolean(),
});
export type PathSubpath = z.infer<typeof PathSubpathSchema>;

export const FillRuleSchema = z.enum(["nonzero", "evenodd"]);
export type FillRule = z.infer<typeof FillRuleSchema>;

export const PathNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("path"),
  subpaths: z.array(PathSubpathSchema),
  fillRule: FillRuleSchema,
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
});
export type PathNode = RefineSemantics<z.infer<typeof PathNodeSchema>>;

// Persisted scene graphs are trusted straight through as SceneGraph (see
// pagesStore.ts's hydratePages) with no runtime Zod validation at that
// boundary, so a PathNode saved before this schema change (flat
// {points, closed}, no subpaths) wouldn't be caught by a parse — it would
// just crash the first code that reads node.subpaths. Call this once, on
// raw JSON, before it's treated as a SceneGraph.
export function normalizeLegacyPathNodes(graph: unknown): unknown {
  if (!graph || typeof graph !== "object" || !("nodes" in graph)) return graph;
  const nodes = (graph as { nodes: unknown }).nodes;
  if (!nodes || typeof nodes !== "object") return graph;

  const normalizedNodes: Record<string, unknown> = {};
  for (const [id, node] of Object.entries(nodes as Record<string, unknown>)) {
    normalizedNodes[id] = normalizeLegacyPathNode(node);
  }
  return { ...(graph as object), nodes: normalizedNodes };
}

function normalizeLegacyPathNode(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const record = node as Record<string, unknown>;
  if (record.type !== "path" || "subpaths" in record) return node;

  const { points, closed, ...rest } = record;
  return { ...rest, subpaths: [{ points: points ?? [], closed: closed ?? false }], fillRule: "nonzero" };
}

// Layout fields for a container that can arrange its own children —
// Frame and Section only, since GroupNode is a pure authoring convenience
// with no real DOM output and deliberately stays outside the layout
// system (its own bounds are instead continuously re-fit to hug its
// children — see reconcileGroupBounds.ts — which would fight a flex
// parent's sizing assignment if Group could opt into layoutMode too).
export const FlexDirectionSchema = z.enum(["row", "column"]);
export type FlexDirection = z.infer<typeof FlexDirectionSchema>;

export const LayoutModeSchema = z.enum(["none", "flex"]);
export type LayoutMode = z.infer<typeof LayoutModeSchema>;

export const PrimaryAxisAlignSchema = z.enum([
  "start",
  "center",
  "end",
  "spaceBetween",
]);
export type PrimaryAxisAlign = z.infer<typeof PrimaryAxisAlignSchema>;

export const CrossAxisAlignSchema = z.enum(["start", "center", "end", "stretch"]);
export type CrossAxisAlign = z.infer<typeof CrossAxisAlignSchema>;

export const PaddingSchema = z.object({
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  left: z.number(),
});
export type Padding = z.infer<typeof PaddingSchema>;

const layoutContainerShape = {
  layoutMode: LayoutModeSchema,
  direction: FlexDirectionSchema,
  gap: z.number(),
  padding: PaddingSchema,
  primaryAxisAlign: PrimaryAxisAlignSchema,
  crossAxisAlign: CrossAxisAlignSchema,
};

export const FrameNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("frame"),
  children: z.array(NodeIdSchema),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
  clipsContent: z.boolean(),
  cornerRadius: z.number(),
  ...layoutContainerShape,
});
export type FrameNode = RefineSemantics<z.infer<typeof FrameNodeSchema>>;

export const SectionNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("section"),
  children: z.array(NodeIdSchema),
  ...layoutContainerShape,
});
export type SectionNode = RefineSemantics<z.infer<typeof SectionNodeSchema>>;

export const GroupNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("group"),
  children: z.array(NodeIdSchema),
});
export type GroupNode = RefineSemantics<z.infer<typeof GroupNodeSchema>>;

// InstanceNode.overrides is, in TS, `Record<NodeId, Partial<SceneNode>>` —
// a partial of a recursive discriminated union. Zod has no direct
// equivalent (there's no clean "partial of a union" combinator), and the
// codebase itself already treats override keys as UI-layer-enforced, not
// type-checked (same convention as BaseNode's own `bindings` field). Validate
// loosely at runtime; keep the precise recursive type at the type layer via
// a manual override, same pattern as Semantics above.
export const InstanceNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("instance"),
  componentId: ComponentIdSchema,
  overrides: z.record(NodeIdSchema, z.record(z.string(), z.unknown())),
});
export type InstanceNode = RefineSemantics<
  Omit<z.infer<typeof InstanceNodeSchema>, "overrides">
> & {
  overrides: Record<NodeId, Partial<SceneNode>>;
};

export const SceneNodeSchema = z.discriminatedUnion("type", [
  RectNodeSchema,
  EllipseNodeSchema,
  LineNodeSchema,
  ArrowNodeSchema,
  ImageNodeSchema,
  TextNodeSchema,
  PathNodeSchema,
  FrameNodeSchema,
  SectionNodeSchema,
  GroupNodeSchema,
  InstanceNodeSchema,
]);
export type SceneNode =
  | RectNode
  | EllipseNode
  | LineNode
  | ArrowNode
  | ImageNode
  | TextNode
  | PathNode
  | FrameNode
  | SectionNode
  | GroupNode
  | InstanceNode;

// The node types that can hold children — resize/hit-test/reparent logic
// that needs to walk into children checks against this, not against
// FrameNode/SectionNode/GroupNode individually.
export type ContainerNode = FrameNode | SectionNode | GroupNode;

export const SceneGraphSchema = z.object({
  nodes: z.record(NodeIdSchema, SceneNodeSchema),
  rootIds: z.array(NodeIdSchema),
});
// `nodes`'s value type otherwise resolves to the raw, unrefined z.infer of
// SceneNodeSchema (semantics.tag as `string`) rather than the exported
// `SceneNode` type above (semantics.tag as `SemanticTag`) — override it so
// `graph.nodes[id]` type-checks the same way everywhere in apps/web.
export type SceneGraph = Omit<z.infer<typeof SceneGraphSchema>, "nodes"> & {
  nodes: Record<NodeId, SceneNode>;
};

// A mapped type over the discriminant, not a plain object literal type —
// same reasoning as the exhaustive per-node-type tables elsewhere in this
// codebase (e.g. the canvas renderer's nodeKinds.ts): TypeScript requires
// every SceneNode variant to have an entry, so a new node type without one
// is a compile error rather than a silently-missing default. `semantics`
// stays `null` by default on every node (see baseNodeShape above) — this
// table is deliberately NOT written into stored node data at creation
// time, only consulted as a fallback wherever a resolved tag is actually
// needed (the HTML exporter, the properties panel's Semantics section),
// so `semantics !== null` keeps meaning "someone explicitly set this,"
// not "this happens to match the generic default."
export const DEFAULT_SEMANTIC_TAG: Record<SceneNode["type"], SemanticTag> = {
  rect: "div",
  ellipse: "div",
  line: "div",
  arrow: "div",
  image: "picture",
  text: "p",
  path: "div",
  frame: "div",
  section: "div",
  group: "div",
  instance: "div",
};

export function resolveSemanticTag(node: SceneNode): SemanticTag {
  return node.semantics?.tag ?? DEFAULT_SEMANTIC_TAG[node.type];
}
