import { useRef } from "react";
import { createSetNodesCommand } from "@open-canvas/commands";
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
// instant canvas feedback, and a single command is pushed to history only
// once editing actually finishes — so typing "120" into a width field is
// one undo step, not three.
export function useNodeEdit(nodeId: NodeId): NodeEditHandlers {
  // The whole nodes record, not just this one node — editing certain
  // fields (e.g. a Frame's layoutMode/direction/gap) triggers side effects
  // on OTHER nodes via the store's reconciliation pipeline (resolveFlexLayout
  // resolving every child's x/y/width/height). Diffing only the edited
  // node at commit would silently drop those side effects from the undo
  // step, leaving children stranded at their post-edit positions after an
  // undo that only reverted the field that caused them to move.
  const beforeRef = useRef<Record<NodeId, SceneNode> | null>(null);

  function onFieldFocus(): void {
    beforeRef.current = sceneStore.getState().nodes;
  }

  // A shallow `{...node, ...patch}` merge is correct for plain fields, but
  // wrong for an object-valued field patched partially (e.g. one filter
  // out of seven on ImageNode.filters) — replacing the whole sub-object
  // wholesale would silently drop every OTHER key already on the node,
  // and doing that replacement from a value the caller built off its own
  // (possibly stale, pre-render) prop risks losing a second field's edit
  // that landed in the store between two rapid onChange calls. Merging
  // one level deep for any patch entry that's a plain object — generic,
  // not specific to any one field name — means the caller only ever needs
  // to send the single key that actually changed, and it always lands on
  // top of whatever's currently in the store, not a stale snapshot.
  function onFieldChange(patch: Record<string, unknown>): void {
    sceneStore.update((graph) => {
      const node = graph.nodes[nodeId];
      if (!node) return graph;

      const merged: Record<string, unknown> = { ...node };
      for (const [key, value] of Object.entries(patch)) {
        const current = (node as Record<string, unknown>)[key];
        merged[key] = isPlainObject(value) && isPlainObject(current) ? { ...current, ...value } : value;
      }
      return { ...graph, nodes: { ...graph.nodes, [nodeId]: merged as SceneNode } };
    });
  }

  function onFieldCommit(): void {
    const before = beforeRef.current;
    beforeRef.current = null;
    if (!before) return;

    const after = sceneStore.getState().nodes;
    if (before === after) return;

    const beforeMap = new Map<NodeId, SceneNode>();
    const afterMap = new Map<NodeId, SceneNode>();
    for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const beforeNode = before[id];
      const afterNode = after[id];
      if (beforeNode === afterNode) continue;
      if (beforeNode) beforeMap.set(id, beforeNode);
      if (afterNode) afterMap.set(id, afterNode);
    }
    if (beforeMap.size === 0) return;

    historyManager.execute(createSetNodesCommand(beforeMap, afterMap));
  }

  return { onFieldFocus, onFieldChange, onFieldCommit };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
