import type { HistoryEntry } from "@open-canvas/commands";
import { normalizeLegacyPathNodes, type SceneGraph } from "@open-canvas/schema";
import { fetchJson } from "./api";

export interface Page {
  id: string;
  projectId: string;
  name: string;
  sceneGraph: SceneGraph;
  createdAt: string;
  updatedAt: string;
}

// Persisted pages are trusted straight through as Page[] with no runtime
// validation (fetchJson just casts the response body) — normalize here, the
// one place old-shape PathNode data (pre-dating the subpaths schema change)
// would otherwise reach the rest of the app and crash the first thing that
// reads node.subpaths.
export async function listPages(projectId: string): Promise<Page[]> {
  const pages = await fetchJson<Page[]>(`/api/projects/${projectId}/pages`);
  return pages.map((page) => ({
    ...page,
    sceneGraph: normalizeLegacyPathNodes(page.sceneGraph) as SceneGraph,
  }));
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
