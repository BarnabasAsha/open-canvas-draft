import { createAddNodeCommand } from "../../commands/AddNodeCommand";
import { createSetNodeCommand } from "../../commands/SetNodeCommand";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import { textEditStore } from "../../store/textEditStore";
import type { NodeId, TextNode } from "../../types/scene";

// Enter/commit/cancel are the only three ways an edit session can end, and
// all three live here rather than in the overlay component — the overlay
// just renders a textarea and calls these, it doesn't decide what a commit
// means.
export function enterTextEdit(node: TextNode, isNew: boolean): void {
  textEditStore.startEditing({ nodeId: node.id, isNew, before: node });
  // Hide resize handles/outline while typing — matches how a newly-created
  // node (never selected in the first place) already looks during editing.
  selectionStore.update((state) => ({ ...state, selectedIds: new Set() }));
  setVisible(node.id, false);
}

export function commitTextEdit(content: string): void {
  const state = textEditStore.getState();
  if (!state) return;

  const { nodeId, isNew, before } = state;
  textEditStore.stopEditing();

  // An empty new node was never a real shape — discard it rather than
  // leaving an invisible, unselectable text layer behind, same rule
  // dragToCreateTool uses for an accidental too-small draw.
  if (isNew && content.trim() === "") {
    sceneStore.removeNode(nodeId);
    return;
  }

  const current = sceneStore.getState().nodes[nodeId];
  if (!current || current.type !== "text") return;

  const after: TextNode = { ...current, content, visible: true };
  sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [nodeId]: after } }));

  if (isNew) {
    historyManager.execute(createAddNodeCommand(after));
  } else if (after.content !== before.content) {
    historyManager.execute(createSetNodeCommand(nodeId, before, after));
  }

  selectionStore.update((s) => ({ ...s, selectedIds: new Set([nodeId]) }));
}

export function cancelTextEdit(): void {
  const state = textEditStore.getState();
  if (!state) return;

  textEditStore.stopEditing();

  if (state.isNew) {
    sceneStore.removeNode(state.nodeId);
  } else {
    setVisible(state.nodeId, true);
  }
}

function setVisible(nodeId: NodeId, visible: boolean): void {
  sceneStore.update((scene) => {
    const node = scene.nodes[nodeId];
    if (!node) return scene;
    return { ...scene, nodes: { ...scene.nodes, [nodeId]: { ...node, visible } } };
  });
}
