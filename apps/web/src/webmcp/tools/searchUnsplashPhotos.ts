import { searchPhotos, type UnsplashPhoto } from "../../lib/unsplash";
import { ok, type WebMcpTool } from "../types";

export interface SearchUnsplashPhotosInput {
  query: string;
}

// Same pairing IconsTab/search_icons established for icons — an agent needs
// a way to discover a photo (and its id) before placing one with
// add_unsplash_photo.
export const searchUnsplashPhotosTool: WebMcpTool<SearchUnsplashPhotosInput, UnsplashPhoto[]> = {
  name: "search_unsplash_photos",
  description: "Search Unsplash for free stock photos. Use a result's `id` with add_unsplash_photo.",
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
