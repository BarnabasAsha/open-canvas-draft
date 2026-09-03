import { createGroupNodesCommand } from "@open-canvas/commands";
import type { NodeId } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface GroupElementsInput {
  nodeIds: NodeId[];
}

export const groupElementsTool: WebMcpTool<GroupElementsInput, { groupId: NodeId }> = {
  name: "group_elements",
  description: "Group two or more elements together by id, wrapping them in a new group node fit to their combined bounds.",
  inputSchema: {
    type: "object",
    properties: { nodeIds: { type: "array", items: { type: "string" } } },
    required: ["nodeIds"],
    additionalProperties: false,
  },
  async execute({ nodeIds }) {
    const graph = sceneStore.getState();
    const command = createGroupNodesCommand(graph, nodeIds);
    if (!command) return fail("Need at least two nodeIds, and none can be an ancestor of another.");

    historyManager.execute(command);
    const after = sceneStore.getState();
    const groupId = Object.keys(after.nodes).find((id) => !graph.nodes[id]);
    if (!groupId) return fail("Group was created but its id couldn't be resolved.");

    selectionStore.update((state) => ({ ...state, selectedIds: new Set([groupId]) }));
    return ok({ groupId });
  },
};
