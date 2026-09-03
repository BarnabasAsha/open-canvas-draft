import { frameExportFileName, renderFrameToHtml } from "@open-canvas/commands";
import type { ComponentDefinition } from "@open-canvas/commands";
import type { ComponentId } from "@open-canvas/schema";
import { BaseQuery, NotFoundError } from "../../../../core";
import { requireUserId, type RequestContext } from "../../../../lib/request-context";
import type { ProjectRepository } from "../../repositories/project.repository";
import { loadOwnedPage } from "../load-owned-page";
import type { PageRepository } from "../repositories/page.repository";

export interface ExportFrameHtmlInput {
  pageId: string;
  frameId: string;
  // Component definitions the frame's instance nodes need to resolve —
  // never persisted server-side (componentsStore.ts is client-only), so
  // the caller sends whatever it already has in memory. See the plan's
  // "explicitly out of scope" note on persisting these properly later.
  componentDefinitions: Record<ComponentId, ComponentDefinition>;
}

export interface ExportFrameHtmlResult {
  html: string;
  fileName: string;
}

export class ExportFrameHtmlQuery extends BaseQuery<ExportFrameHtmlInput, ExportFrameHtmlResult> {
  private readonly pageRepository: PageRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly requestContext: RequestContext;

  constructor(pageRepository: PageRepository, projectRepository: ProjectRepository, requestContext: RequestContext) {
    super();
    this.pageRepository = pageRepository;
    this.projectRepository = projectRepository;
    this.requestContext = requestContext;
  }

  async execute(input: ExportFrameHtmlInput): Promise<ExportFrameHtmlResult> {
    const userId = requireUserId(this.requestContext);
    const page = await loadOwnedPage(this.pageRepository, this.projectRepository, input.pageId, userId);

    const frame = page.sceneGraph.nodes[input.frameId];
    if (!frame || frame.type !== "frame") {
      throw new NotFoundError("Frame not found");
    }

    const html = renderFrameToHtml(input.frameId, page.sceneGraph.nodes, input.componentDefinitions);
    return { html, fileName: frameExportFileName(frame) };
  }
}
