import { fetchJson } from "../../lib/api";
import type { Project } from "../../ui/ProjectList/ProjectList";
import { navigateTo } from "../navigate";
import { ok, type WebMcpTool } from "../types";

export interface CreateProjectInput {
  name: string;
  description?: string;
}

// Mirrors ProjectsPage.tsx's own handleCreate exactly — same endpoint, same
// body shape, same "navigate to the new project afterward" behavior a
// human clicking "Create project" gets.
export const createProjectTool: WebMcpTool<CreateProjectInput, Project> = {
  name: "create_project",
  description: "Create a new project and open it. Give it a name, and optionally a short description.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
    },
    required: ["name"],
    additionalProperties: false,
  },
  async execute({ name, description }) {
    const project = await fetchJson<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(description ? { name, description } : { name }),
    });
    navigateTo(`/design/${project.id}`);
    return ok(project);
  },
};
