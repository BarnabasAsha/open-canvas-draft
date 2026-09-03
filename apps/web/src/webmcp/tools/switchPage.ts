import { pagesStore, switchToPage } from "../../store/pagesStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface SwitchPageInput {
  pageId: string;
}

// Not undoable, same reasoning as select_elements — switching pages is
// navigation, not an edit.
export const switchPageTool: WebMcpTool<SwitchPageInput, { pageId: string; pageName: string }> = {
  name: "switch_page",
  description: "Switch which page of the project is active, by id (see list_pages).",
  inputSchema: {
    type: "object",
    properties: { pageId: { type: "string" } },
    required: ["pageId"],
    additionalProperties: false,
  },
  async execute({ pageId }) {
    const page = pagesStore.getState().pages.find((p) => p.id === pageId);
    if (!page) return fail(`No page with id ${pageId}.`);
    switchToPage(pageId);
    return ok({ pageId: page.id, pageName: page.name });
  },
};
