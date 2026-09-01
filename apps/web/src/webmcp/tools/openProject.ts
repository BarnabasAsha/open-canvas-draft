import { navigateTo } from "../navigate";
import { ok, type WebMcpTool } from "../types";

export interface OpenProjectInput {
  projectId: string;
}

// Just navigates — same as clicking a project tile. A nonexistent or
// not-yours project id is handled the same way either way: CanvasEditorPage
// itself redirects back to the projects list on a failed load, so this
// doesn't duplicate that check.
export const openProjectTool: WebMcpTool<OpenProjectInput, { projectId: string }> = {
  name: "open_project",
  description: "Open a project by id (see list_projects), navigating into its canvas.",
  inputSchema: {
    type: "object",
    properties: { projectId: { type: "string" } },
    required: ["projectId"],
    additionalProperties: false,
  },
  async execute({ projectId }) {
    navigateTo(`/design/${projectId}`);
    return ok({ projectId });
  },
};
