import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import type { ImageNode } from "@open-canvas/schema";
import { listAssets } from "../../lib/assets";
import { getCurrentProjectId } from "../../store/currentProject";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { IMAGE_PROPERTY_SCHEMA, type ImageProperties } from "../nodeProperties";
import { fail, ok, type WebMcpTool } from "../types";

// Same default box size placeImageFromAsset (CanvasEditorPage.tsx) uses —
// big enough to see, left for a follow-up update_element/resize.
const DEFAULT_IMAGE_SIZE = 240;

export interface AddImageInput {
  assetId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: ImageProperties;
}

// Places an already-uploaded asset only — there's no tool for uploading a
// new one (a real File isn't a sane LLM tool input; see list_assets and
// the plan's explicitly-out-of-scope note).
export const addImageTool: WebMcpTool<AddImageInput, ImageNode> = {
  name: "add_image",
  description: "Place an already-uploaded image (see list_assets for the id) onto the page at x/y.",
  inputSchema: {
    type: "object",
    properties: {
      assetId: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      properties: { type: "object", properties: IMAGE_PROPERTY_SCHEMA, additionalProperties: false },
    },
    required: ["assetId", "x", "y"],
    additionalProperties: false,
  },
  async execute({ assetId, x, y, width, height, properties }) {
    const projectId = getCurrentProjectId();
    if (!projectId) return fail("No project is currently open.");

    const asset = (await listAssets(projectId)).find((a) => a.id === assetId);
    if (!asset) return fail(`No asset with id ${assetId}.`);

    const node: ImageNode = {
      id: generateId(),
      type: "image",
      name: nextDefaultName(sceneStore.getState(), "Image"),
      parentId: null,
      x,
      y,
      width: width ?? DEFAULT_IMAGE_SIZE,
      height: height ?? DEFAULT_IMAGE_SIZE,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      semantics: null,
      interactions: [],
      sizingHorizontal: "fixed",
      sizingVertical: "fixed",
      positioning: "flow",
      src: asset.url,
      alt: null,
      objectFit: "cover",
      filters: { blur: 0, brightness: 1, contrast: 1, grayscale: 0, saturate: 1, sepia: 0, hueRotate: 0 },
      ...properties,
    };

    historyManager.execute(createAddNodeCommand(node));
    selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));

    const stored = sceneStore.getState().nodes[node.id];
    return stored ? ok(stored as ImageNode) : fail("Image was added but couldn't be read back.");
  },
};
