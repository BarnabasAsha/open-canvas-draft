import { createAddNodeCommand, generateId, nextDefaultName, parseSvgPath, scalePathSubpaths } from "@open-canvas/commands";
import type { PathNode } from "@open-canvas/schema";
import { loadIconManifest } from "../../lib/iconManifest";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { PATH_PROPERTY_SCHEMA, type PathProperties } from "../nodeProperties";
import { fail, ok, type WebMcpTool } from "../types";

// Same fixed insertion size CanvasEditorPage.tsx's placeIconFromLibrary
// uses.
const DEFAULT_ICON_SIZE = 48;

export interface AddIconInput {
  name: string;
  x: number;
  y: number;
  size?: number;
  properties?: PathProperties;
}

// Places a bundled Phosphor icon (see search_icons) as a real, editable
// PathNode — parse -> scale -> build, the same pipeline
// CanvasEditorPage.tsx's placeIconFromLibrary uses for a human's click,
// just parameterized by explicit x/y/size like every other add_* tool's
// input shape instead of centering on the viewport.
export const addIconTool: WebMcpTool<AddIconInput, PathNode> = {
  name: "add_icon",
  description: "Insert a bundled Phosphor icon (see search_icons for valid names) onto the page at x/y, as a real vector node, not an image.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      size: { type: "number" },
      properties: { type: "object", properties: PATH_PROPERTY_SCHEMA, additionalProperties: false },
    },
    required: ["name", "x", "y"],
    additionalProperties: false,
  },
  async execute({ name, x, y, size, properties }) {
    const manifest = await loadIconManifest();
    const icon = manifest.find((entry) => entry.name === name);
    if (!icon) return fail(`No icon named "${name}" — use search_icons to find a valid name.`);

    const targetSize = size ?? DEFAULT_ICON_SIZE;
    const [, , viewBoxWidth, viewBoxHeight] = icon.viewBox.split(/\s+/).map(Number);
    const scaleX = viewBoxWidth === 0 ? 1 : targetSize / viewBoxWidth;
    const scaleY = viewBoxHeight === 0 ? 1 : targetSize / viewBoxHeight;
    const subpaths = scalePathSubpaths(parseSvgPath(icon.d), scaleX, scaleY);

    const node: PathNode = {
      id: generateId(),
      type: "path",
      name: nextDefaultName(sceneStore.getState(), icon.pascalName),
      parentId: null,
      x,
      y,
      width: targetSize,
      height: targetSize,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      semantics: null,
      interactions: [],
      sizingHorizontal: "fixed",
      sizingVertical: "fixed",
      positioning: "flow",
      subpaths,
      fillRule: "nonzero",
      fill: "#111827",
      stroke: null,
      strokeWidth: 0,
      strokeStyle: "solid",
      ...properties,
    };

    historyManager.execute(createAddNodeCommand(node));
    selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));

    const stored = sceneStore.getState().nodes[node.id];
    return stored ? ok(stored as PathNode) : fail("Icon was added but couldn't be read back.");
  },
};
