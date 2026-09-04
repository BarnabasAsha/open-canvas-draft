import { searchPhotos, type UnsplashPhoto } from "../../lib/unsplash";
import { ok, type WebMcpTool } from "../types";

export interface SearchUnsplashPhotosInput {
  query: string;
}

// Same pairing IconsTab/search_icons established for icons — an agent needs
// a way to discover a photo before placing one with add_unsplash_photo.
// add_unsplash_photo takes several fields straight from a result here
// (regularUrl, width, height, photographerName, downloadLocation), not a
// bare id — the description below says so explicitly, since a caller
// guessing "pass the id" (the more typical add_image-style pairing) would
// get a confusing required-field validation error instead.
export const searchUnsplashPhotosTool: WebMcpTool<SearchUnsplashPhotosInput, UnsplashPhoto[]> = {
  name: "search_unsplash_photos",
  description:
    "Search Unsplash for free stock photos. add_unsplash_photo takes several fields straight from a result here (regularUrl, width, height, photographerName, downloadLocation) — not just the id.",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
  async execute({ query }) {
    return ok(await searchPhotos(query));
  },
};
