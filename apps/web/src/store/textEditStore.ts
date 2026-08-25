import type { NodeId, TextNode } from "@open-canvas/schema";
import { createStore } from "./createStore";

export interface TextEditState {
  nodeId: NodeId;
  // Whether the node was just created by textTool (never committed to
  // history) vs. an existing node re-entered via double-click — determines
  // how textEdit.ts's commit/cancel logic treats it.
  isNew: boolean;
  before: TextNode;
}

const store = createStore<TextEditState | null>(null);

function startEditing(state: TextEditState): void {
  store.update(() => state);
}

function stopEditing(): void {
  store.update(() => null);
}

export const textEditStore = { ...store, startEditing, stopEditing };
