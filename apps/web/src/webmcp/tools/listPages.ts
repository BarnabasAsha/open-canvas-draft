import { pagesStore } from "../../store/pagesStore";
import { ok, type WebMcpTool } from "../types";

export interface PageSummary {
  id: string;
  name: string;
  active: boolean;
}

export const listPagesTool: WebMcpTool<Record<string, never>, PageSummary[]> = {
  name: "list_pages",
  description: "List every page in the current project, and which one is active. Use an id from here with switch_page.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute() {
    const { pages, activePageId } = pagesStore.getState();
    return ok(pages.map((page) => ({ id: page.id, name: page.name, active: page.id === activePageId })));
  },
};
