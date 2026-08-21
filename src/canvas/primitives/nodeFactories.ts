import type { EllipseNode, FrameNode, NodeId, PathNode, PathPoint, RectNode, Semantics, StrokeStyle, TextNode } from "../../types/scene";

// Small, deliberately-typed node builders — the point isn't to save
// keystrokes, it's to stop builtInComponents.ts's seed trees from drowning
// in BaseNode boilerplate (rotation/opacity/visible/locked/interactions are
// the same on every single node in every one of these compositions).

interface CommonProps {
  id: NodeId;
  parentId: NodeId | null;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function makeFrame(
  props: CommonProps & {
    fill?: string | null;
    stroke?: string | null;
    strokeWidth?: number;
    strokeStyle?: StrokeStyle;
    cornerRadius?: number;
    clipsContent?: boolean;
    children?: NodeId[];
    semantics?: Semantics | null;
  },
): FrameNode {
  return {
    id: props.id,
    type: "frame",
    name: props.name,
    parentId: props.parentId,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: props.semantics ?? null,
    interactions: [],
    fill: props.fill ?? null,
    stroke: props.stroke ?? null,
    strokeWidth: props.strokeWidth ?? (props.stroke ? 1 : 0),
    strokeStyle: props.strokeStyle ?? "solid",
    clipsContent: props.clipsContent ?? false,
    cornerRadius: props.cornerRadius ?? 0,
    children: props.children ?? [],
  };
}

export function makeRect(
  props: CommonProps & {
    fill?: string | null;
    stroke?: string | null;
    strokeWidth?: number;
    strokeStyle?: StrokeStyle;
    cornerRadius?: number;
    visible?: boolean;
  },
): RectNode {
  return {
    id: props.id,
    type: "rect",
    name: props.name,
    parentId: props.parentId,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    rotation: 0,
    opacity: 1,
    visible: props.visible ?? true,
    locked: false,
    semantics: null,
    interactions: [],
    fill: props.fill ?? null,
    stroke: props.stroke ?? null,
    strokeWidth: props.strokeWidth ?? (props.stroke ? 1 : 0),
    strokeStyle: props.strokeStyle ?? "solid",
    cornerRadius: props.cornerRadius ?? 0,
  };
}

export function makeEllipse(
  props: CommonProps & { fill?: string | null; stroke?: string | null; strokeWidth?: number; strokeStyle?: StrokeStyle; visible?: boolean },
): EllipseNode {
  return {
    id: props.id,
    type: "ellipse",
    name: props.name,
    parentId: props.parentId,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    rotation: 0,
    opacity: 1,
    visible: props.visible ?? true,
    locked: false,
    semantics: null,
    interactions: [],
    fill: props.fill ?? null,
    stroke: props.stroke ?? null,
    strokeWidth: props.strokeWidth ?? (props.stroke ? 1 : 0),
    strokeStyle: props.strokeStyle ?? "solid",
  };
}

export function makeText(
  props: CommonProps & {
    content: string;
    color: string;
    fontSize?: number;
    fontWeight?: number;
    align?: TextNode["align"];
    textDecoration?: TextNode["textDecoration"];
    semantics?: Semantics | null;
  },
): TextNode {
  return {
    id: props.id,
    type: "text",
    name: props.name,
    parentId: props.parentId,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: props.semantics ?? null,
    interactions: [],
    content: props.content,
    fontSize: props.fontSize ?? 14,
    fontFamily: "sans-serif",
    fontWeight: props.fontWeight ?? 400,
    fontStyle: "normal",
    letterSpacing: 0,
    lineHeight: 1.2,
    textDecoration: props.textDecoration ?? "none",
    color: props.color,
    align: props.align ?? "left",
  };
}

export function makePath(
  props: CommonProps & { points: PathPoint[]; closed?: boolean; stroke?: string | null; strokeWidth?: number; fill?: string | null; visible?: boolean },
): PathNode {
  return {
    id: props.id,
    type: "path",
    name: props.name,
    parentId: props.parentId,
    x: props.x,
    y: props.y,
    width: props.width,
    height: props.height,
    rotation: 0,
    opacity: 1,
    visible: props.visible ?? true,
    locked: false,
    semantics: null,
    interactions: [],
    points: props.points,
    closed: props.closed ?? false,
    fill: props.fill ?? null,
    stroke: props.stroke ?? null,
    strokeWidth: props.strokeWidth ?? 1.5,
    strokeStyle: "solid",
  };
}
