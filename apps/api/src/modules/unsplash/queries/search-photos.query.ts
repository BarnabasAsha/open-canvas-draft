import { BaseQuery } from "../../../core";
import { requireUserId, type RequestContext } from "../../../lib/request-context";
import type { UnsplashClient, UnsplashPhotoDTO } from "../../../lib/unsplash-client";

export interface SearchPhotosInput {
  // Absent/empty — UnsplashTab's default view before the user has searched
  // for anything — falls back to Unsplash's own editorial feed rather than
  // an empty tab.
  query?: string;
  page?: number;
}

// No repository/domain model here — search results are a pure passthrough
// of an external API's data, not one of this app's own persisted entities.
export class SearchPhotosQuery extends BaseQuery<SearchPhotosInput, UnsplashPhotoDTO[]> {
  private readonly unsplashClient: UnsplashClient;
  private readonly requestContext: RequestContext;

  constructor(unsplashClient: UnsplashClient, requestContext: RequestContext) {
    super();
    this.unsplashClient = unsplashClient;
    this.requestContext = requestContext;
  }

  async execute(input: SearchPhotosInput): Promise<UnsplashPhotoDTO[]> {
    requireUserId(this.requestContext);
    return input.query ? this.unsplashClient.search(input.query, input.page) : this.unsplashClient.list(input.page);
  }
}
