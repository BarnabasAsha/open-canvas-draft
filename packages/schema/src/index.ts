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

export const ImageNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("image"),
  src: z.string(),
  objectFit: z.enum(["fill", "contain", "cover"]),
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

export const PathNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("path"),
  points: z.array(PathPointSchema),
  closed: z.boolean(),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  strokeStyle: StrokeStyleSchema,
});
export type PathNode = RefineSemantics<z.infer<typeof PathNodeSchema>>;

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
});
export type FrameNode = RefineSemantics<z.infer<typeof FrameNodeSchema>>;

export const SectionNodeSchema = z.object({
  ...baseNodeShape,
  type: z.literal("section"),
  children: z.array(NodeIdSchema),
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
