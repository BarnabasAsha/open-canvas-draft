import { fetchJson } from "./api";

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  width: number;
  height: number;
  thumbUrl: string;
  regularUrl: string;
  photographerName: string;
  photographerProfileUrl: string;
  downloadLocation: string;
}

export function searchPhotos(query: string, page?: number): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({ query });
  if (page) params.set("page", String(page));
  return fetchJson<UnsplashPhoto[]>(`/api/unsplash/search?${params}`);
}

// Fired at the moment a photo is actually placed on the canvas, not at
// search time — Unsplash's API guidelines require this ping only for
// photos that are actually used, separate from being shown in results.
export function trackDownload(downloadLocation: string): Promise<void> {
  return fetchJson<void>("/api/unsplash/track-download", {
    method: "POST",
    body: JSON.stringify({ downloadLocation }),
  });
}
