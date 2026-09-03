import { createReorderToEdgeCommand } from "@open-canvas/commands";
import type { NodeId } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface ReorderElementsInput {
  nodeIds: NodeId[];
  edge: "front" | "back";
}

export const reorderElementsTool: WebMcpTool<ReorderElementsInput, { nodeIds: NodeId[]; edge: "front" | "back" }> = {
  name: "reorder_elements",
  description: "Move one or more elements to the front or back of their parent's stacking order (z-order).",
  inputSchema: {
    type: "object",
    properties: {
      nodeIds: { type: "array", items: { type: "string" } },
      edge: { type: "string", enum: ["front", "back"] },
    },
    required: ["nodeIds", "edge"],
    additionalProperties: false,
  },
  async execute({ nodeIds, edge }) {
    const graph = sceneStore.getState();
    const command = createReorderToEdgeCommand(graph, nodeIds, edge);
    if (!command) return fail("Nothing to reorder — check the node ids, or they may already be at that edge.");

    historyManager.execute(command);
    return ok({ nodeIds, edge });
  },
};
