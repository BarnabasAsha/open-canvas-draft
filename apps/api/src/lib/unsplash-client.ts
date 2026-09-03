import { DomainError } from "../core";

// Match this to the application name registered at unsplash.com/developers
// — Unsplash's attribution guidelines require utm_source on every link back
// to a photographer's profile.
const UNSPLASH_APP_NAME = "open_canvas";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
// Demo-tier Unsplash apps cap at 50 requests/hour — stay one under so a
// legitimate concurrent request never gets the raw upstream 403 instead of
// this client's own clearer rejection.
const RATE_LIMIT_MAX_REQUESTS = 49;

export interface UnsplashPhotoDTO {
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

interface UnsplashApiPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  width: number;
  height: number;
  urls: { thumb: string; regular: string };
  links: { download_location: string };
  user: { name: string; links: { html: string } };
}

interface UnsplashSearchResponse {
  results: UnsplashApiPhoto[];
}

function toDto(photo: UnsplashApiPhoto): UnsplashPhotoDTO {
  const profileUrl = new URL(photo.user.links.html);
  profileUrl.searchParams.set("utm_source", UNSPLASH_APP_NAME);
  profileUrl.searchParams.set("utm_medium", "referral");

  return {
    id: photo.id,
    description: photo.description ?? photo.alt_description,
    width: photo.width,
    height: photo.height,
    thumbUrl: photo.urls.thumb,
    regularUrl: photo.urls.regular,
    photographerName: photo.user.name,
    photographerProfileUrl: profileUrl.toString(),
    downloadLocation: photo.links.download_location,
  };
}

// A single instance lives for the process lifetime (registered as a lazy
// root-container factory, same as R2Client — see container.ts), so the
// in-memory sliding-window counter below is genuinely process-wide, not
// per-request: exactly what a shared-Access-Key rate limit needs.
export class UnsplashClient {
  private readonly accessKey: string;
  private requestTimestamps: number[] = [];

  constructor(accessKey: string) {
    this.accessKey = accessKey;
  }

  private checkRateLimit(): void {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > cutoff);
    if (this.requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
      throw new DomainError("Unsplash search rate limit reached — try again later");
    }
    this.requestTimestamps.push(Date.now());
  }

  async search(query: string, page = 1): Promise<UnsplashPhotoDTO[]> {
    this.checkRateLimit();

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "24");

    const response = await fetch(url, { headers: { Authorization: `Client-ID ${this.accessKey}` } });
    if (!response.ok) throw new Error(`Unsplash search failed: ${response.status} ${response.statusText}`);

    const body = (await response.json()) as UnsplashSearchResponse;
    return body.results.map(toDto);
  }

  // Unsplash's own editorial feed (GET /photos, not /search/photos) — used
  // for the tab's default view before the user has searched for anything,
  // so it isn't just empty. Its response is a bare array, unlike search's
  // {results: [...]} wrapper.
  async list(page = 1): Promise<UnsplashPhotoDTO[]> {
    this.checkRateLimit();

    const url = new URL("https://api.unsplash.com/photos");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "24");
    url.searchParams.set("order_by", "popular");

    const response = await fetch(url, { headers: { Authorization: `Client-ID ${this.accessKey}` } });
    if (!response.ok) throw new Error(`Unsplash list failed: ${response.status} ${response.statusText}`);

    const body = (await response.json()) as UnsplashApiPhoto[];
    return body.map(toDto);
  }

  // Unsplash requires this GET fired whenever a photo is actually used (not
  // just shown in search results) — separate from serving the image itself,
  // this is purely a usage-tracking ping. downloadLocation comes straight
  // from a prior search() result's own downloadLocation field, but it's
  // still client-supplied by the time it reaches here (round-tripped
  // through the frontend) — the host is checked before fetching so a
  // tampered value can't turn this into an SSRF proxy that leaks the
  // Access Key header to an arbitrary server.
  async trackDownload(downloadLocation: string): Promise<void> {
    const url = new URL(downloadLocation);
    if (url.hostname !== "api.unsplash.com") throw new DomainError("Invalid Unsplash download location");

    const response = await fetch(url, { headers: { Authorization: `Client-ID ${this.accessKey}` } });
    if (!response.ok) throw new Error(`Unsplash download tracking failed: ${response.status} ${response.statusText}`);
  }
}

export function createUnsplashClientFromEnv(): UnsplashClient {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error("UNSPLASH_ACCESS_KEY is required");
  return new UnsplashClient(accessKey);
}
