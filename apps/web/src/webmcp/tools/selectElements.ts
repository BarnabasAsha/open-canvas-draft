import type { NodeId } from "@open-canvas/schema";
import { selectionStore } from "../../store/selectionStore";
import { ok, type WebMcpTool } from "../types";

export interface SelectElementsInput {
  nodeIds: NodeId[];
}

// Not undoable — matches the human UI exactly, where selecting a layer
// never goes through historyManager either.
export const selectElementsTool: WebMcpTool<SelectElementsInput, { selectedIds: NodeId[] }> = {
  name: "select_elements",
  description:
    "Select one or more nodes by id (replaces the current selection). Lets you and the person you're collaborating with share attention on the same elements — pass an empty array to clear the selection.",
  inputSchema: {
    type: "object",
    properties: {
      nodeIds: { type: "array", items: { type: "string" }, description: "Node ids to select." },
    },
    required: ["nodeIds"],
    additionalProperties: false,
  },
  async execute({ nodeIds }) {
    selectionStore.update((state) => ({ ...state, selectedIds: new Set(nodeIds) }));
    return ok({ selectedIds: nodeIds });
  },
};
