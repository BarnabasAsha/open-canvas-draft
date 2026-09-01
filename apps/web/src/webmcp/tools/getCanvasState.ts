import type { NodeId, SceneNode } from "@open-canvas/schema";
import { pagesStore } from "../../store/pagesStore";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { ok, type WebMcpTool } from "../types";

export interface GetCanvasStateOutput {
  pageId: string;
  pageName: string;
  nodes: Record<NodeId, SceneNode>;
  rootIds: NodeId[];
  selectedIds: NodeId[];
}

export const getCanvasStateTool: WebMcpTool<Record<string, never>, GetCanvasStateOutput> = {
  name: "get_canvas_state",
  description:
    "Read the current page: every node keyed by id, the top-level node ids, and the current selection. Call this before adding or editing anything to see what's already on the canvas.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute() {
    const { pages, activePageId } = pagesStore.getState();
    const page = pages.find((p) => p.id === activePageId);
    const { nodes, rootIds } = sceneStore.getState();
    const { selectedIds } = selectionStore.getState();

    return ok({
      pageId: activePageId,
      pageName: page?.name ?? "",
      nodes,
      rootIds,
      selectedIds: [...selectedIds],
    });
  },
};
