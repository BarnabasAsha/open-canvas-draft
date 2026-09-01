import { listAssets, type Asset } from "../../lib/assets";
import { getCurrentProjectId } from "../../store/currentProject";
import { fail, ok, type WebMcpTool } from "../types";

export const listAssetsTool: WebMcpTool<Record<string, never>, Asset[]> = {
  name: "list_assets",
  description:
    "List images already uploaded to this project, with their id and url. Use an id from here with add_image — there's no tool to upload a new image.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute() {
    const projectId = getCurrentProjectId();
    if (!projectId) return fail("No project is currently open.");
    return ok(await listAssets(projectId));
  },
};
