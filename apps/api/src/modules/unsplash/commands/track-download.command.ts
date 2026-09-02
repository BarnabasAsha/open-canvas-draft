import { BaseCommand, ok, type CommandResult } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import type { UnsplashClient } from "../../../lib/unsplash-client";

export interface TrackDownloadInput {
  downloadLocation: string;
}

// Fires Unsplash's required "this photo was actually used" ping — separate
// from search, which only shows the photo, not uses it.
export class TrackDownloadCommand extends BaseCommand<TrackDownloadInput, void> {
  private readonly unsplashClient: UnsplashClient;
  private readonly requestContext: RequestContext;

  constructor(unsplashClient: UnsplashClient, requestContext: RequestContext) {
    super();
    this.unsplashClient = unsplashClient;
    this.requestContext = requestContext;
  }

  async execute(input: TrackDownloadInput): Promise<CommandResult<void>> {
    requireUserId(this.requestContext);
    await this.unsplashClient.trackDownload(input.downloadLocation);
    return ok(undefined);
  }
}
