import { fetchJson } from "../../lib/api";
import type { Project } from "../../ui/ProjectList/ProjectList";
import { ok, type WebMcpTool } from "../types";

export const listProjectsTool: WebMcpTool<Record<string, never>, Project[]> = {
  name: "list_projects",
  description: "List every project owned by the current user. Use an id from here with open_project.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute() {
    return ok(await fetchJson<Project[]>("/api/projects"));
  },
};
