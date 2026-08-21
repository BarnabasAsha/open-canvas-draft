import { useRef } from "react";
import { createSetNodeCommand } from "../../../commands/SetNodeCommand";
import { historyManager } from "../../../store/historyManager";
import { sceneStore } from "../../../store/sceneStore";
import type { InstanceNode, NodeId, SceneNode } from "../../../types/scene";
import type { NodeEditHandlers } from "./useNodeEdit";

// Same live-preview-then-commit-once shape as useNodeEdit, but the thing
// actually being edited is the OWNING INSTANCE's `overrides` map, not a
// live graph node — editing "this inner Button's label" from the Layers
// panel writes `instance.overrides[defNodeId] = {...patch}` and diffs/
// commits the instance itself, so undo/redo works exactly the same way a
// direct field edit does.
export function useInstanceOverrideEdit(instanceId: NodeId, defNodeId: NodeId): NodeEditHandlers {
  const beforeRef = useRef<SceneNode | null>(null);

  function onFieldFocus(): void {
    beforeRef.current = sceneStore.getState().nodes[instanceId] ?? null;
  }

  function onFieldChange(patch: Record<string, unknown>): void {
    sceneStore.update((graph) => {
      const node = graph.nodes[instanceId];
      if (!node || node.type !== "instance") return graph;
      const nextNode: InstanceNode = { ...node, overrides: { ...node.overrides, [defNodeId]: { ...node.overrides[defNodeId], ...patch } } };
      return { ...graph, nodes: { ...graph.nodes, [instanceId]: nextNode } };
    });
  }

  function onFieldCommit(): void {
    const before = beforeRef.current;
    beforeRef.current = null;

    const after = sceneStore.getState().nodes[instanceId];
    if (!before || !after || before === after) return;

    historyManager.execute(createSetNodeCommand(instanceId, before, after));
  }

  return { onFieldFocus, onFieldChange, onFieldCommit };
}
