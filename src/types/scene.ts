// ─── Core scene types ───────────────────────────────────────────────
export type NodeId = string;
export type VariableId = string;

export interface BaseNode {
  id: NodeId;
  type: string;
  name: string;
  parentId: NodeId | null; // null = root level
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  opacity: number; // 0–1
  visible: boolean;
  locked: boolean;

  // AI-native / prototyping additions
  semantics: Semantics | null;
  interactions: Interaction[];
  bindings?: Record<string, VariableId>; // property name -> variable id
  // NOTE: which keys are valid here is enforced at the UI/AI-schema layer,
  // per node type (e.g. TextNode allows "content", RectNode allows "fill"),
  // not by TypeScript itself — see PropertiesPanel per-type allowlists.
}

// ─── Semantics: what this node becomes when rendered as real DOM ──────

export type SemanticTag = keyof HTMLElementTagNameMap; // "div" | "button" | "input" | "a" | ...

export interface Semantics {
  tag: SemanticTag;
  role?: string; // could tighten to React's AriaRole type later
  properties?: Record<string, string | number | boolean>; // e.g. { placeholder: "Email", href: "/pricing" }
}

// ─── Variables: shared state that node properties can bind to ─────────

export type VariableType = "boolean" | "number" | "string";

export interface Variable {
  id: VariableId;
  name: string;
  type: VariableType;
  defaultValue: boolean | number | string;
}

// ─── Interactions: trigger -> actions, fully data-driven ──────────────

export type TransitionType =
  | "instant"
  | "slide"
  | "dissolve"
  | "push"
  | "smartAnimate";

export type InteractionAction =
  | {
      type: "setVariable";
      variableId: VariableId;
      value: boolean | number | string;
    }
  | { type: "toggleVariable"; variableId: VariableId } // boolean only
  | { type: "incrementVariable"; variableId: VariableId; by: number } // number only
  | { type: "navigate"; targetNodeId: NodeId; transition?: TransitionType };

export type Interaction =
  | { trigger: "click"; actions: InteractionAction[] }
  | { trigger: "hoverStart"; actions: InteractionAction[] }
  | { trigger: "hoverEnd"; actions: InteractionAction[] }
  | { trigger: "pressStart"; actions: InteractionAction[] }
  | { trigger: "pressEnd"; actions: InteractionAction[] }
  | { trigger: "focus"; actions: InteractionAction[] }
  | { trigger: "blur"; actions: InteractionAction[] }
  | { trigger: "change"; actions: InteractionAction[] }
  | { trigger: "keyPress"; key: string; actions: InteractionAction[] }
  | { trigger: "load"; actions: InteractionAction[] }
  | { trigger: "afterDelay"; delayMs: number; actions: InteractionAction[] };

export interface RectNode extends BaseNode {
  type: "rect";
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseNode extends BaseNode {
  type: "ellipse";
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
}

export interface LineNode extends BaseNode {
  type: "line";
  x2: number; // second endpoint, in the same coordinate space as x/y
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface ArrowNode extends BaseNode {
  type: "arrow";
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  arrowheadSize: number;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  objectFit: "fill" | "contain" | "cover";
}

export interface TextNode extends BaseNode {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
}

export interface PathPoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export interface PathNode extends BaseNode {
  type: "path";
  points: PathPoint[];
  closed: boolean;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
}

export interface FrameNode extends BaseNode {
  type: "frame";
  children: NodeId[];
  fill: string | null;
  clipsContent: boolean;
  cornerRadius: number;
}

export interface SectionNode extends BaseNode {
  type: "section";
  children: NodeId[];
}

export interface GroupNode extends BaseNode {
  type: "group";
  children: NodeId[];
}

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
  | GroupNode;

// The node types that can hold children — resize/hit-test/reparent logic
// that needs to walk into children checks against this, not against
// FrameNode/SectionNode/GroupNode individually.
export type ContainerNode = FrameNode | SectionNode | GroupNode;

export interface SceneGraph {
  nodes: Record<NodeId, SceneNode>;
  rootIds: NodeId[];
}
