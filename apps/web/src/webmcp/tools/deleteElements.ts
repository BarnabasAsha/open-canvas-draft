import { createDeleteNodesCommand } from "@open-canvas/commands";
import type { NodeId } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface DeleteElementsInput {
  nodeIds: NodeId[];
}

// Registered like every other tool (see webmcp/tools/index.ts) — undo
// (Cmd+Z) reverses it the same as any other command here.
export const deleteElementsTool: WebMcpTool<DeleteElementsInput, { deletedIds: NodeId[] }> = {
  name: "delete_elements",
  description: "Delete one or more elements (and their children) by id.",
  inputSchema: {
    type: "object",
    properties: { nodeIds: { type: "array", items: { type: "string" } } },
    required: ["nodeIds"],
    additionalProperties: false,
  },
  async execute({ nodeIds }) {
    if (nodeIds.length === 0) return fail("nodeIds is empty.");
    const graph = sceneStore.getState();
    const missing = nodeIds.filter((id) => !graph.nodes[id]);
    if (missing.length > 0) return fail(`No element(s) with id ${missing.join(", ")}.`);

    historyManager.execute(createDeleteNodesCommand(graph, nodeIds));
    return ok({ deletedIds: nodeIds });
  },
};
