import { addPage, pagesStore, renamePage } from "../../store/pagesStore";
import { ok, type WebMcpTool } from "../types";

export interface CreatePageInput {
  name?: string;
}

// addPage() itself takes no name (it auto-numbers "Page N") and reports
// failure via the shared saveStatus store rather than throwing/rejecting —
// same as every other pagesStore call. Detected here by comparing the page
// count before/after rather than trusting the resolved promise alone.
export const createPageTool: WebMcpTool<CreatePageInput, { pageId: string; pageName: string }> = {
  name: "create_page",
  description: "Add a new, empty page to the current project and make it active. Optionally give it a name.",
  inputSchema: {
    type: "object",
    properties: { name: { type: "string", description: "Optional page name; auto-numbered if omitted." } },
    additionalProperties: false,
  },
  async execute({ name }) {
    const before = pagesStore.getState().pages.length;
    await addPage();
    const after = pagesStore.getState();
    if (after.pages.length <= before) return { ok: false, error: "Failed to create a new page." };

    const page = after.pages[after.pages.length - 1];
    if (name) await renamePage(page.id, name);

    return ok({ pageId: page.id, pageName: name ?? page.name });
  },
};
