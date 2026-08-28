import { applySceneEvent, invertSceneEvent, ROOT_KEY, type SceneEvent } from "../events";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import type { Command } from "./Command";

// Handles both a single node and a multi-selection uniformly — for a
// multi-selection, members can span different parents, so each parent's
// children array is rebuilt independently: the selected members among
// that parent's children move to the requested edge as a block, keeping
// their relative order among each other (their own current sibling
// order), and everything else keeps its relative order too. Built as a
// direct array reconstruction per parent rather than a sequence of
// single-node reorderChildInGraph calls, so there's no risk of earlier
// moves shifting the indices later ones depend on.
export function createReorderToEdgeCommand(graph: SceneGraph, nodeIds: readonly NodeId[], edge: "front" | "back"): Command | null {
  const byParent = new Map<string, NodeId[]>();
  for (const id of nodeIds) {
    const node = graph.nodes[id];
    if (!node) continue;
    const key = node.parentId ?? ROOT_KEY;
    const list = byParent.get(key) ?? [];
    list.push(id);
    byParent.set(key, list);
  }
  if (byParent.size === 0) return null;

  const originalArrays: Record<string, NodeId[]> = {};
  const newArrays: Record<string, NodeId[]> = {};
  let changed = false;

  for (const [key, ids] of byParent) {
    const siblings = siblingIdsOf(graph, key === ROOT_KEY ? null : key);
    const idSet = new Set(ids);
    const rest = siblings.filter((id) => !idSet.has(id));
    const moved = siblings.filter((id) => idSet.has(id)); // preserves their relative order
    const next = edge === "front" ? [...rest, ...moved] : [...moved, ...rest];

    originalArrays[key] = [...siblings];
    newArrays[key] = next;
    if (!arraysEqual(siblings, next)) changed = true;
  }

  if (!changed) return null;

  const event: SceneEvent = { type: "reorderToEdge", originalArrays, newArrays };
  return {
    event,
    apply: (g) => applySceneEvent(g, event),
    invert: (g) => invertSceneEvent(g, event),
  };
}

function siblingIdsOf(graph: SceneGraph, parentId: NodeId | null): readonly NodeId[] {
  if (!parentId) return graph.rootIds;
  const parent = graph.nodes[parentId];
  return parent && "children" in parent ? parent.children : graph.rootIds;
}

function arraysEqual(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
