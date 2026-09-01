import { createUngroupNodesCommand } from "@open-canvas/commands";
import type { NodeId } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface UngroupElementInput {
  nodeId: NodeId;
}

export const ungroupElementTool: WebMcpTool<UngroupElementInput, { childIds: NodeId[] }> = {
  name: "ungroup_element",
  description: "Dissolve a group by id, reparenting its children up to the group's own parent.",
  inputSchema: {
    type: "object",
    properties: { nodeId: { type: "string" } },
    required: ["nodeId"],
    additionalProperties: false,
  },
  async execute({ nodeId }) {
    const graph = sceneStore.getState();
    const group = graph.nodes[nodeId];
    const childIds = group?.type === "group" ? [...group.children] : [];

    const command = createUngroupNodesCommand(graph, nodeId);
    if (!command) return fail(`${nodeId} is not a group.`);

    historyManager.execute(command);
    return ok({ childIds });
  },
};
