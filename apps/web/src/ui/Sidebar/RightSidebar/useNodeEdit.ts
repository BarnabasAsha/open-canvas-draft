import { useRef } from "react";
import { createSetNodeCommand } from "@open-canvas/commands";
import { historyManager } from "../../../store/historyManager";
import { sceneStore } from "../../../store/sceneStore";
import type { NodeId, SceneNode } from "@open-canvas/schema";

export interface NodeEditHandlers {
  onFieldFocus: () => void;
  onFieldChange: (patch: Record<string, unknown>) => void;
  onFieldCommit: () => void;
}

// Mirrors the live-preview-then-commit-once pattern resize and text-edit
// already use: every keystroke/drag writes straight to sceneStore for
// instant canvas feedback, and a single SetNodeCommand is pushed to
// history only once editing actually finishes — so typing "120" into a
// width field is one undo step, not three.
export function useNodeEdit(nodeId: NodeId): NodeEditHandlers {
  const beforeRef = useRef<SceneNode | null>(null);

  function onFieldFocus(): void {
    beforeRef.current = sceneStore.getState().nodes[nodeId] ?? null;
  }

  function onFieldChange(patch: Record<string, unknown>): void {
    sceneStore.update((graph) => {
      const node = graph.nodes[nodeId];
      if (!node) return graph;
      return { ...graph, nodes: { ...graph.nodes, [nodeId]: { ...node, ...patch } as SceneNode } };
    });
  }

  function onFieldCommit(): void {
    const before = beforeRef.current;
    beforeRef.current = null;

    const after = sceneStore.getState().nodes[nodeId];
    if (!before || !after || before === after) return;

    historyManager.execute(createSetNodeCommand(nodeId, before, after));
  }

  return { onFieldFocus, onFieldChange, onFieldCommit };
}
