import type { HistoryEntry } from "@open-canvas/commands";
import type { SceneGraph } from "@open-canvas/schema";
import { fetchJson } from "./api";

export interface Page {
  id: string;
  projectId: string;
  name: string;
  sceneGraph: SceneGraph;
  createdAt: string;
  updatedAt: string;
}

export function listPages(projectId: string): Promise<Page[]> {
  return fetchJson<Page[]>(`/api/projects/${projectId}/pages`);
}

export function createPage(projectId: string, name: string, sceneGraph: SceneGraph): Promise<Page> {
  return fetchJson<Page>(`/api/projects/${projectId}/pages`, {
    method: "POST",
    body: JSON.stringify({ name, sceneGraph }),
  });
}

export function renamePage(projectId: string, pageId: string, name: string): Promise<Page> {
  return fetchJson<Page>(`/api/projects/${projectId}/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deletePage(projectId: string, pageId: string): Promise<void> {
  return fetchJson<void>(`/api/projects/${projectId}/pages/${pageId}`, { method: "DELETE" });
}

// Separate from rename — this is the hot path for frequent, potentially
// large scene-graph saves, matching the backend's own PUT .../scene split
// (see UpdatePageSceneCommand's comment).
export function updatePageScene(projectId: string, pageId: string, sceneGraph: SceneGraph): Promise<Page> {
  return fetchJson<Page>(`/api/projects/${projectId}/pages/${pageId}/scene`, {
    method: "PUT",
    body: JSON.stringify({ sceneGraph }),
  });
}

// Best-effort history log, not the source of truth for current state (that's
// updatePageScene above) — see pageEventLog.ts.
export function appendPageEvents(projectId: string, pageId: string, entries: HistoryEntry[]): Promise<void> {
  return fetchJson<void>(`/api/projects/${projectId}/pages/${pageId}/events`, {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
}

export interface FrameExportResult {
  html: string;
  fileName: string;
}

// POST despite being a pure read+render on the server — component
// definitions aren't persisted server-side (componentsStore.ts is
// client-only), so whatever the exported frame's instance nodes need
// rides along in the body; the frame/scene data itself is read from the
// server's own already-persisted copy of the page.
export function exportFrameToHtml(
  projectId: string,
  pageId: string,
  frameId: string,
  componentDefinitions: Record<string, unknown>,
): Promise<FrameExportResult> {
  return fetchJson<FrameExportResult>(`/api/projects/${projectId}/pages/${pageId}/frames/${frameId}/export/html`, {
    method: "POST",
    body: JSON.stringify({ componentDefinitions }),
  });
}
