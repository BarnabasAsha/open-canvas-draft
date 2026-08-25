import { useRef } from "react";
import { createSetNodesCommand } from "@open-canvas/commands";
import { historyManager } from "../../../store/historyManager";
import { sceneStore } from "../../../store/sceneStore";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import type { NodeEditHandlers } from "./useNodeEdit";

// Same live-preview-then-commit-once shape as useNodeEdit, applied to every
// id in a same-type multi-selection instead of one node — a field edit
// still lands as a single undo step, just covering N nodes instead of one.
export function useMultiNodeEdit(nodeIds: readonly NodeId[]): NodeEditHandlers {
  const beforeRef = useRef<Map<NodeId, SceneNode> | null>(null);

  function snapshot(): Map<NodeId, SceneNode> {
    const { nodes } = sceneStore.getState();
    const snap = new Map<NodeId, SceneNode>();
    for (const id of nodeIds) {
      const node = nodes[id];
      if (node) snap.set(id, node);
    }
    return snap;
  }

  function onFieldFocus(): void {
    beforeRef.current = snapshot();
  }

  function onFieldChange(patch: Record<string, unknown>): void {
    sceneStore.update((graph) => {
      let next = graph.nodes;
      for (const id of nodeIds) {
        const node = next[id];
        if (!node) continue;
        next = { ...next, [id]: { ...node, ...patch } as SceneNode };
      }
      return next === graph.nodes ? graph : { ...graph, nodes: next };
    });
  }

  function onFieldCommit(): void {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (!before) return;

    const after = snapshot();
    const changed = [...before.entries()].some(([id, node]) => after.get(id) !== node);
    if (!changed) return;

    historyManager.execute(createSetNodesCommand(before, after));
  }

  return { onFieldFocus, onFieldChange, onFieldCommit };
}
