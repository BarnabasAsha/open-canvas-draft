import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import type { ImageNode } from "@open-canvas/schema";
import { trackDownload } from "../../lib/unsplash";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { IMAGE_PROPERTY_SCHEMA, type ImageProperties } from "../nodeProperties";
import { fail, ok, type WebMcpTool } from "../types";

// Same default max dimension CanvasEditorPage.tsx's placeUnsplashPhoto
// uses — overridable here (unlike the human UI, which has no control for
// it) since an agent composing a specific layout needs to size a photo to
// fit it, not just get something reasonably visible.
const DEFAULT_MAX_UNSPLASH_PHOTO_DIMENSION = 320;

export interface AddUnsplashPhotoInput {
  regularUrl: string;
  width: number;
  height: number;
  photographerName: string;
  downloadLocation: string;
  x: number;
  y: number;
  maxDimension?: number;
  properties?: ImageProperties;
}

// Takes the fields straight out of a prior search_unsplash_photos result
// rather than a bare id — avoids a second network round trip, and mirrors
// exactly what a human click already has in hand from the same search.
// Builds the node the same way placeImageFromAsset/placeUnsplashPhoto do
// (aspect-ratio-preserving size, compliant name/alt, fires the required
// download-tracking ping) so an agent-placed photo is exactly as compliant
// as a human-placed one.
export const addUnsplashPhotoTool: WebMcpTool<AddUnsplashPhotoInput, ImageNode> = {
  name: "add_unsplash_photo",
  description:
    'Insert an Unsplash photo (fields from search_unsplash_photos) onto the page at x/y, as a real image node, scaled to fit within maxDimension (default 320) on its longer edge while keeping its real aspect ratio. Fires Unsplash\'s required usage-tracking ping.',
  inputSchema: {
    type: "object",
    properties: {
      regularUrl: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      photographerName: { type: "string" },
      downloadLocation: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      maxDimension: { type: "number", description: "Longer-edge cap in px, aspect ratio preserved. Defaults to 320." },
      properties: { type: "object", properties: IMAGE_PROPERTY_SCHEMA, additionalProperties: false },
    },
    required: ["regularUrl", "width", "height", "photographerName", "downloadLocation", "x", "y"],
    additionalProperties: false,
  },
  async execute({ regularUrl, width: photoWidth, height: photoHeight, photographerName, downloadLocation, x, y, maxDimension, properties }) {
    const scale = Math.min(1, (maxDimension ?? DEFAULT_MAX_UNSPLASH_PHOTO_DIMENSION) / Math.max(photoWidth, photoHeight));
    const width = photoWidth * scale;
    const height = photoHeight * scale;

    const node: ImageNode = {
      id: generateId(),
      type: "image",
      name: nextDefaultName(sceneStore.getState(), `Photo by ${photographerName} on Unsplash`),
      parentId: null,
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      semantics: null,
      interactions: [],
      sizingHorizontal: "fixed",
      sizingVertical: "fixed",
      positioning: "flow",
      src: regularUrl,
      // Explicit, not left to fall back on `name` — name gets a deduped
      // " 2", " 3" suffix from nextDefaultName, which would read oddly as
      // literal alt text. Carries Unsplash's required photographer
      // attribution through to wherever the image ends up.
      alt: `Photo by ${photographerName} on Unsplash`,
      objectFit: "cover",
      filters: { blur: 0, brightness: 1, contrast: 1, grayscale: 0, saturate: 1, sepia: 0, hueRotate: 0 },
      ...properties,
    };

    historyManager.execute(createAddNodeCommand(node));
    selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));

    trackDownload(downloadLocation).catch((err) => {
      console.error("Failed to notify Unsplash of photo use:", err);
    });

    const stored = sceneStore.getState().nodes[node.id];
    return stored ? ok(stored as ImageNode) : fail("Photo was added but couldn't be read back.");
  },
};
