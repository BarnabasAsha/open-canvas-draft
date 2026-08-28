import { fetchJson } from "./api";

export interface Asset {
  id: string;
  projectId: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export function listAssets(projectId: string): Promise<Asset[]> {
  return fetchJson<Asset[]>(`/api/projects/${projectId}/assets`);
}

// `headers: {}` overrides fetchJson's default JSON content-type — a
// FormData body needs the browser to set its own multipart boundary,
// which it only does when no Content-Type header is set manually.
export function uploadAsset(projectId: string, file: File): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJson<Asset>(`/api/projects/${projectId}/assets`, { method: "POST", body: formData, headers: {} });
}

export function deleteAsset(projectId: string, assetId: string): Promise<void> {
  return fetchJson<void>(`/api/projects/${projectId}/assets/${assetId}`, { method: "DELETE" });
}
