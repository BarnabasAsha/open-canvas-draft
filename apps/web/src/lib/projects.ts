import type { Project } from "../ui/ProjectList/ProjectList";
import { fetchJson } from "./api";

export function listProjects(): Promise<Project[]> {
  return fetchJson<Project[]>("/api/projects");
}

export function createProject(name: string, description?: string): Promise<Project> {
  return fetchJson<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(description ? { name, description } : { name }),
  });
}

export function renameProject(projectId: string, name: string): Promise<Project> {
  return fetchJson<Project>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteProject(projectId: string): Promise<void> {
  return fetchJson<void>(`/api/projects/${projectId}`, { method: "DELETE" });
}

// Copies the project's own name+description and every one of its pages
// (new ids throughout) — see DuplicateProjectCommand server-side.
export function duplicateProject(projectId: string): Promise<Project> {
  return fetchJson<Project>(`/api/projects/${projectId}/duplicate`, { method: "POST" });
}
