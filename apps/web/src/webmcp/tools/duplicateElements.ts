import { createDuplicateNodesCommand } from "@open-canvas/commands";
import type { NodeId } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface DuplicateElementsInput {
  nodeIds: NodeId[];
}

export const duplicateElementsTool: WebMcpTool<DuplicateElementsInput, { newNodeIds: NodeId[] }> = {
  name: "duplicate_elements",
  description: "Duplicate one or more elements by id — the copies are offset slightly from the originals and selected.",
  inputSchema: {
    type: "object",
    properties: { nodeIds: { type: "array", items: { type: "string" } } },
    required: ["nodeIds"],
    additionalProperties: false,
  },
  async execute({ nodeIds }) {
    const before = sceneStore.getState();
    const command = createDuplicateNodesCommand(before, nodeIds);
    if (!command) return fail("nodeIds must be non-empty, and none can be an ancestor of another.");

    historyManager.execute(command);
    const after = sceneStore.getState();
    const newNodeIds = Object.keys(after.nodes).filter((id) => !before.nodes[id]);

    selectionStore.update((state) => ({ ...state, selectedIds: new Set(newNodeIds) }));
    return ok({ newNodeIds });
  },
};
