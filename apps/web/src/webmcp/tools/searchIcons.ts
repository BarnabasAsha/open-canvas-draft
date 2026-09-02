import { loadIconManifest } from "../../lib/iconManifest";
import { ok, type WebMcpTool } from "../types";

const MAX_RESULTS = 30;

export interface SearchIconsInput {
  query?: string;
}

export interface IconSummary {
  name: string;
  pascalName: string;
  tags: string[];
}

// The bundled manifest has 1512 icons — far too many to hand an agent in
// one shot, so this mirrors IconsTab.tsx's own capped name/tag filter
// rather than exposing a raw list_icons. Use a result's `name` with
// add_icon.
export const searchIconsTool: WebMcpTool<SearchIconsInput, IconSummary[]> = {
  name: "search_icons",
  description:
    'Search the bundled Phosphor icon set by name or tag (e.g. "heart", "arrow"). Returns up to 30 matches — use a result\'s `name` with add_icon. Omit query to see a default sample.',
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } },
    additionalProperties: false,
  },
  async execute({ query }) {
    const manifest = await loadIconManifest();
    const q = query?.trim().toLowerCase() ?? "";
    const filtered = q === "" ? manifest : manifest.filter((icon) => icon.name.includes(q) || icon.tags.some((tag) => tag.includes(q)));
    const results: IconSummary[] = filtered.slice(0, MAX_RESULTS).map(({ name, pascalName, tags }) => ({ name, pascalName, tags }));
    return ok(results);
  },
};
