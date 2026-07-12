export type NodeId = string;

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
}

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
  label: string;
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
  | SectionNode;

export interface SceneGraph {
  nodes: Record<NodeId, SceneNode>;
  rootIds: NodeId[];
}
