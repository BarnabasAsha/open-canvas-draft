import {
  createComponentDefinition,
  createDeleteNodesCommand,
  createDuplicateNodesCommand,
  createGroupNodesCommand,
  createReorderToEdgeCommand,
  createReplaceWithInstanceCommand,
  createUngroupNodesCommand,
  generateId,
  nextDefaultName,
} from "@open-canvas/commands";
import { registerComponent } from "../store/componentsStore";
import { historyManager } from "../store/historyManager";
import { sceneStore } from "../store/sceneStore";
import { selectionStore } from "../store/selectionStore";
import type { NodeId, SceneGraph } from "@open-canvas/schema";

// The single place "what does Delete/Group/Ungroup/Create Component/etc.
// actually do" lives — called from both useKeyboardShortcuts.ts and
// NodeContextMenu.tsx, so the keyboard shortcut and the context menu item
// can never drift apart from each other.

export function deleteSelection(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size === 0) return;
  historyManager.execute(createDeleteNodesCommand(sceneStore.getState(), [...selectedIds]));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set() }));
}

export function groupSelection(): void {
  const { selectedIds } = selectionStore.getState();
  const command = createGroupNodesCommand(sceneStore.getState(), [...selectedIds]);
  if (!command) return;
  historyManager.execute(command);
  // The new group's id isn't returned by the command itself — after
  // apply(), it's whichever node the members now share as a parent.
  const [anyMemberId] = selectedIds;
  const groupId = sceneStore.getState().nodes[anyMemberId]?.parentId;
  if (groupId) selectionStore.update((state) => ({ ...state, selectedIds: new Set([groupId]) }));
}

export function ungroupSelection(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size !== 1) return;
  const [soleId] = selectedIds;
  const group = sceneStore.getState().nodes[soleId];
  if (!group || group.type !== "group") return;

  const memberIds = [...group.children];
  const command = createUngroupNodesCommand(sceneStore.getState(), soleId);
  if (!command) return;
  historyManager.execute(command);
  selectionStore.update((state) => ({ ...state, selectedIds: new Set(memberIds) }));
}

export function createComponentFromSelection(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size === 0) return;

  const graph = sceneStore.getState();
  const memberIds = [...selectedIds];
  const snapshot = createComponentDefinition(graph, memberIds, nextDefaultName(graph, "Component"));
  if (!snapshot) return;

  registerComponent(snapshot.definition);
  const instanceId = generateId();
  const command = createReplaceWithInstanceCommand(graph, memberIds, snapshot.definition, snapshot.bounds, instanceId);
  historyManager.execute(command);
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([instanceId]) }));
}

export function duplicateSelection(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size === 0) return;

  const graph = sceneStore.getState();
  const memberIds = [...selectedIds];
  const command = createDuplicateNodesCommand(graph, memberIds);
  if (!command) return;

  historyManager.execute(command);
  // The clones' ids aren't returned by the command — apply() inserted
  // them immediately after each original, so re-reading each original's
  // now-next sibling gives the same set without needing the command to
  // expose its internal id map.
  const after = sceneStore.getState();
  const cloneIds: NodeId[] = [];
  for (const id of memberIds) {
    const original = graph.nodes[id];
    const siblings = original.parentId ? childrenOf(after, original.parentId) : after.rootIds;
    const index = siblings.indexOf(id);
    const cloneId = index === -1 ? undefined : siblings[index + 1];
    if (cloneId) cloneIds.push(cloneId);
  }
  if (cloneIds.length > 0) selectionStore.update((state) => ({ ...state, selectedIds: new Set(cloneIds) }));
}

function childrenOf(graph: SceneGraph, parentId: NodeId): readonly NodeId[] {
  const parent = graph.nodes[parentId];
  return parent && "children" in parent ? parent.children : graph.rootIds;
}

export function bringToFront(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size === 0) return;
  const command = createReorderToEdgeCommand(sceneStore.getState(), [...selectedIds], "front");
  if (command) historyManager.execute(command);
}

export function sendToBack(): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size === 0) return;
  const command = createReorderToEdgeCommand(sceneStore.getState(), [...selectedIds], "back");
  if (command) historyManager.execute(command);
}
