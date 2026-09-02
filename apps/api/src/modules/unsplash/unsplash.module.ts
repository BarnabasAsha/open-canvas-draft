import type { AsyncSpec, Module, SpecMap } from "@inferdi/inferdi";
import type { RequestContext } from "../../lib/request-context";
import type { UnsplashClient } from "../../lib/unsplash-client";
import { TrackDownloadCommand } from "./commands/track-download.command";
import { SearchPhotosQuery } from "./queries/search-photos.query";

type UnsplashRequirements = SpecMap<{ unsplashClient: UnsplashClient }> & {
  requestContext: AsyncSpec<RequestContext, "scoped">;
};

type UnsplashProvides = SpecMap<
  {
    searchPhotosQuery: SearchPhotosQuery;
    trackDownloadCommand: TrackDownloadCommand;
  },
  "transient"
>;

export const unsplashModule: Module<UnsplashRequirements, UnsplashProvides> = (c) =>
  c
    .registerClass("searchPhotosQuery", SearchPhotosQuery, ["unsplashClient", "requestContext"], "transient")
    .registerClass("trackDownloadCommand", TrackDownloadCommand, ["unsplashClient", "requestContext"], "transient");
