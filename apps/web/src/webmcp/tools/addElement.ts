import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import type { ArrowNode, EllipseNode, LineNode, RectNode, SceneNode, SectionNode, TextNode } from "@open-canvas/schema";
import { buildFrameNode } from "../../canvas/tools/buildFrameNode";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import {
  ARROW_PROPERTY_SCHEMA,
  ELLIPSE_PROPERTY_SCHEMA,
  FRAME_PROPERTY_SCHEMA,
  LINE_PROPERTY_SCHEMA,
  RECT_PROPERTY_SCHEMA,
  SECTION_PROPERTY_SCHEMA,
  TEXT_PROPERTY_SCHEMA,
  type ArrowProperties,
  type EllipseProperties,
  type FrameProperties,
  type LineProperties,
  type RectProperties,
  type SectionProperties,
  type TextProperties,
} from "../nodeProperties";
import { fail, ok, type WebMcpTool } from "../types";

interface AddElementBase {
  name?: string;
}

// A real discriminated union, not a loose bag — `properties` is typed
// per-type from the actual node schema (see ../nodeProperties.ts), so
// e.g. a "line" input can't accidentally carry a rect-only `cornerRadius`.
export type AddElementInput =
  | (AddElementBase & { type: "rect"; x: number; y: number; width: number; height: number; properties?: RectProperties })
  | (AddElementBase & { type: "ellipse"; x: number; y: number; width: number; height: number; properties?: EllipseProperties })
  | (AddElementBase & { type: "line"; x: number; y: number; x2: number; y2: number; properties?: LineProperties })
  | (AddElementBase & { type: "arrow"; x: number; y: number; x2: number; y2: number; properties?: ArrowProperties })
  | (AddElementBase & { type: "text"; x: number; y: number; width: number; height: number; properties?: TextProperties })
  | (AddElementBase & { type: "section"; x: number; y: number; width: number; height: number; properties?: SectionProperties })
  | (AddElementBase & { type: "frame"; x: number; y: number; width: number; height: number; properties?: FrameProperties });

const baseFields = {
  parentId: null,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  semantics: null,
  interactions: [],
  sizingHorizontal: "fixed" as const,
  sizingVertical: "fixed" as const,
  positioning: "flow" as const,
};

// Every default below is copied from the real shape tool that draws it by
// hand (rectangleTool.ts, ellipseTool.ts, lineTool.ts, arrowTool.ts,
// textTool.ts, sectionTool.ts) — not invented. frame reuses buildFrameNode
// directly (its own dependency-free file, deliberately not exported from
// frameTool.ts — see that file's own comment on why). Spreading
// `input.properties` last is fully type-safe here — TypeScript narrows it
// to exactly that type's own Properties type per case, which structurally
// cannot contain id/type/parentId/children, so there's nothing to strip.
function buildNode(id: string, name: string, input: AddElementInput): SceneNode {
  switch (input.type) {
    case "rect":
      return {
        ...baseFields,
        id,
        type: "rect",
        name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        fill: "#d9d9d9",
        stroke: null,
        strokeWidth: 0,
        strokeStyle: "solid",
        cornerRadius: 0,
        ...input.properties,
      } satisfies RectNode;
    case "ellipse":
      return {
        ...baseFields,
        id,
        type: "ellipse",
        name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        fill: "#d9d9d9",
        stroke: null,
        strokeWidth: 0,
        strokeStyle: "solid",
        ...input.properties,
      } satisfies EllipseNode;
    case "line":
      return {
        ...baseFields,
        id,
        type: "line",
        name,
        x: input.x,
        y: input.y,
        x2: input.x2,
        y2: input.y2,
        width: Math.abs(input.x2 - input.x),
        height: Math.abs(input.y2 - input.y),
        stroke: "#111827",
        strokeWidth: 2,
        strokeStyle: "solid",
        ...input.properties,
      } satisfies LineNode;
    case "arrow":
      return {
        ...baseFields,
        id,
        type: "arrow",
        name,
        x: input.x,
        y: input.y,
        x2: input.x2,
        y2: input.y2,
        width: Math.abs(input.x2 - input.x),
        height: Math.abs(input.y2 - input.y),
        stroke: "#111827",
        strokeWidth: 2,
        strokeStyle: "solid",
        arrowheadSize: 10,
        ...input.properties,
      } satisfies ArrowNode;
    case "text":
      return {
        ...baseFields,
        id,
        type: "text",
        name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        content: "",
        fontSize: 16,
        fontFamily: "sans-serif",
        fontWeight: 400,
        fontStyle: "normal",
        letterSpacing: 0,
        lineHeight: 1.2,
        textDecoration: "none",
        color: "#111827",
        align: "left",
        ...input.properties,
      } satisfies TextNode;
    case "section":
      return {
        ...baseFields,
        id,
        type: "section",
        name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        semantics: { tag: "section" },
        layoutMode: "none",
        direction: "row",
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        primaryAxisAlign: "start",
        crossAxisAlign: "start",
        children: [],
        ...input.properties,
      } satisfies SectionNode;
    case "frame":
      return { ...buildFrameNode(id, name, input.x, input.y, input.width, input.height), ...input.properties };
  }
}

function geometryProperties(type: string) {
  const xy = { x: { type: "number" }, y: { type: "number" } };
  if (type === "line" || type === "arrow") {
    return { ...xy, x2: { type: "number" }, y2: { type: "number" } };
  }
  return { ...xy, width: { type: "number" }, height: { type: "number" } };
}

function branchSchema(type: string, propertySchema: object) {
  return {
    type: "object",
    properties: {
      type: { const: type },
      ...geometryProperties(type),
      name: { type: "string" },
      properties: { type: "object", properties: propertySchema, additionalProperties: false },
    },
    required: type === "line" || type === "arrow" ? ["type", "x", "y", "x2", "y2"] : ["type", "x", "y", "width", "height"],
    additionalProperties: false,
  };
}

export const addElementTool: WebMcpTool<AddElementInput, SceneNode> = {
  name: "add_element",
  description:
    "Add a new element to the current page. Pick one of the seven types — each has its own shape (line/arrow use x2/y2 instead of width/height) and its own set of `properties` you can set at creation time.",
  inputSchema: {
    oneOf: [
      branchSchema("rect", RECT_PROPERTY_SCHEMA),
      branchSchema("ellipse", ELLIPSE_PROPERTY_SCHEMA),
      branchSchema("line", LINE_PROPERTY_SCHEMA),
      branchSchema("arrow", ARROW_PROPERTY_SCHEMA),
      branchSchema("text", TEXT_PROPERTY_SCHEMA),
      branchSchema("section", SECTION_PROPERTY_SCHEMA),
      branchSchema("frame", FRAME_PROPERTY_SCHEMA),
    ],
  },
  async execute(input) {
    const id = generateId();
    const name = input.name ?? nextDefaultName(sceneStore.getState(), input.type[0].toUpperCase() + input.type.slice(1));
    const node = buildNode(id, name, input);

    historyManager.execute(createAddNodeCommand(node));
    selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));

    const stored = sceneStore.getState().nodes[node.id];
    return stored ? ok(stored) : fail("Element was added but couldn't be read back.");
  },
};
