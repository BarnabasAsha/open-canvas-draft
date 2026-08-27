import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
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
  const byParent = new Map<NodeId | null, NodeId[]>();
  for (const id of nodeIds) {
    const node = graph.nodes[id];
    if (!node) continue;
    const list = byParent.get(node.parentId) ?? [];
    list.push(id);
    byParent.set(node.parentId, list);
  }
  if (byParent.size === 0) return null;

  const originalArrays = new Map<NodeId | null, readonly NodeId[]>();
  const newArrays = new Map<NodeId | null, readonly NodeId[]>();
  let changed = false;

  for (const [parentId, ids] of byParent) {
    const siblings = siblingIdsOf(graph, parentId);
    const idSet = new Set(ids);
    const rest = siblings.filter((id) => !idSet.has(id));
    const moved = siblings.filter((id) => idSet.has(id)); // preserves their relative order
    const next = edge === "front" ? [...rest, ...moved] : [...moved, ...rest];

    originalArrays.set(parentId, siblings);
    newArrays.set(parentId, next);
    if (!arraysEqual(siblings, next)) changed = true;
  }

  if (!changed) return null;

  return {
    apply: (g) => applyChildArrays(g, newArrays),
    invert: (g) => applyChildArrays(g, originalArrays),
  };
}

function siblingIdsOf(graph: SceneGraph, parentId: NodeId | null): readonly NodeId[] {
  if (!parentId) return graph.rootIds;
  const parent = graph.nodes[parentId];
  return parent && "children" in parent ? parent.children : graph.rootIds;
}

function applyChildArrays(graph: SceneGraph, arrays: Map<NodeId | null, readonly NodeId[]>): SceneGraph {
  let nodes: Record<NodeId, SceneNode> = graph.nodes;
  let rootIds = graph.rootIds;

  for (const [parentId, children] of arrays) {
    if (parentId === null) {
      rootIds = [...children];
      continue;
    }
    const parent = nodes[parentId];
    if (parent && "children" in parent) {
      nodes = { ...nodes, [parentId]: { ...parent, children: [...children] } };
    }
  }

  return { nodes, rootIds };
}

function arraysEqual(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
