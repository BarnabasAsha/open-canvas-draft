import { createMoveNodeCommand } from "@open-canvas/commands";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import { computeAlignedNodes, computeAlignedToContainer, type AlignKind } from "../../canvas/tools/alignment";
import { historyManager } from "../../store/historyManager";
import { reconcileGroupBounds } from "../../store/reconcileGroupBounds";
import { sceneStore } from "../../store/sceneStore";
import { fail, ok, type WebMcpTool } from "../types";

const ALIGN_KINDS = ["left", "centerH", "right", "top", "centerV", "bottom"] as const;

export interface ArrangeElementsInput {
  nodeIds: NodeId[];
  alignment: AlignKind;
}

// Mirrors alignSelection in CanvasEditorPage.tsx exactly: one node aligns
// its own children to it (Figma-style); two or more align to each other's
// combined bounds. "Distribute" and grid arrangement aren't offered — they
// don't exist in this app for a human to use either (see the plan's
// explicitly-out-of-scope note).
export const arrangeElementsTool: WebMcpTool<ArrangeElementsInput, { movedIds: NodeId[] }> = {
  name: "arrange_elements",
  description:
    "Align elements: left, centerH, right, top, centerV, or bottom. One node id aligns its own children to it; two or more align to each other's combined bounds.",
  inputSchema: {
    type: "object",
    properties: {
      nodeIds: { type: "array", items: { type: "string" } },
      alignment: { type: "string", enum: ALIGN_KINDS },
    },
    required: ["nodeIds", "alignment"],
    additionalProperties: false,
  },
  async execute({ nodeIds, alignment }) {
    if (!ALIGN_KINDS.includes(alignment)) return fail(`Unknown alignment "${alignment}".`);
    if (nodeIds.length === 0) return fail("nodeIds is empty.");

    const graph = sceneStore.getState();
    const patch =
      nodeIds.length === 1
        ? computeAlignedToContainer(nodeIds[0], graph, alignment)
        : computeAlignedNodes(nodeIds, graph, alignment);
    if (patch.size === 0) return ok({ movedIds: [] });

    const patchedNodes = { ...graph.nodes };
    for (const [id, node] of patch) patchedNodes[id] = node;
    const reconciled = reconcileGroupBounds({ ...graph, nodes: patchedNodes });

    const before = new Map<NodeId, SceneNode>();
    const after = new Map<NodeId, SceneNode>();
    for (const id of Object.keys(reconciled.nodes)) {
      if (reconciled.nodes[id] !== graph.nodes[id]) {
        before.set(id, graph.nodes[id]);
        after.set(id, reconciled.nodes[id]);
      }
    }
    if (after.size === 0) return ok({ movedIds: [] });

    historyManager.execute(createMoveNodeCommand({ nodes: before, rootIds: graph.rootIds }, { nodes: after, rootIds: graph.rootIds }));
    return ok({ movedIds: [...after.keys()] });
  },
};
