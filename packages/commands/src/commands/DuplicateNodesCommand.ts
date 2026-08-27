import { collectWithDescendants, hasAncestorAmongMembers, removeNodesFromGraph } from "../graphMutations";
import { generateId } from "../id";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import type { Command } from "./Command";

// A fixed nudge, not zero — a duplicate landing exactly on top of its
// original would be invisible/indistinguishable until moved. Irrelevant
// for a flex flow child (the next reconciliation pass repositions it
// based on its new index in the children array regardless of x/y), so
// this only actually matters for an absolutely-positioned duplicate.
const DUPLICATE_OFFSET = 16;

// Clones each top-level member (plus its descendants) under the SAME
// parent as the original — unlike componentMutations.ts's clone helpers,
// which reparent everything under a brand-new synthetic root and so snap
// to a scene-space origin, nothing here changes coordinate spaces, so a
// plain local offset is all that's needed.
export function createDuplicateNodesCommand(graph: SceneGraph, memberIds: NodeId[]): Command | null {
  if (memberIds.length === 0 || hasAncestorAmongMembers(graph, memberIds)) return null;

  const idsToClone = collectWithDescendants(graph, memberIds);
  const idMap = new Map<NodeId, NodeId>();
  for (const id of idsToClone) idMap.set(id, generateId());

  const memberIdSet = new Set(memberIds);
  const clonedNodes: Record<NodeId, SceneNode> = {};
  for (const oldId of idsToClone) {
    const original = graph.nodes[oldId];
    const newId = idMap.get(oldId)!;
    const isMember = memberIdSet.has(oldId);

    let cloned: SceneNode = {
      ...original,
      id: newId,
      parentId: isMember ? original.parentId : (original.parentId ? (idMap.get(original.parentId) ?? null) : null),
    };
    if (cloned.type === "frame" || cloned.type === "section" || cloned.type === "group") {
      cloned = { ...cloned, children: cloned.children.map((childId) => idMap.get(childId) ?? childId) };
    }
    if (isMember) cloned = offsetPosition(cloned, DUPLICATE_OFFSET, DUPLICATE_OFFSET);

    clonedNodes[newId] = cloned;
  }

  const newMemberIds = memberIds.map((id) => idMap.get(id)!);

  return {
    // Each clone is spliced in immediately after its original in z-order
    // (matching where a fresh duplicate visually "belongs"), not appended
    // to the end the way addNodeToGraph always does.
    apply: (g) => {
      let nodes: Record<NodeId, SceneNode> = { ...g.nodes, ...clonedNodes };
      let rootIds = g.rootIds;

      for (const oldId of memberIds) {
        const newId = idMap.get(oldId)!;
        const parentId = g.nodes[oldId]?.parentId ?? null;

        if (parentId) {
          const parent = nodes[parentId];
          if (parent && "children" in parent) {
            const index = parent.children.indexOf(oldId);
            const children = [...parent.children];
            children.splice(index + 1, 0, newId);
            nodes = { ...nodes, [parentId]: { ...parent, children } };
          }
        } else {
          const index = rootIds.indexOf(oldId);
          const next = [...rootIds];
          next.splice(index + 1, 0, newId);
          rootIds = next;
        }
      }

      return { nodes, rootIds };
    },
    invert: (g) => removeNodesFromGraph(g, newMemberIds),
  };
}

function offsetPosition(node: SceneNode, dx: number, dy: number): SceneNode {
  if (node.type === "line" || node.type === "arrow") {
    return { ...node, x: node.x + dx, y: node.y + dy, x2: node.x2 + dx, y2: node.y2 + dy };
  }
  return { ...node, x: node.x + dx, y: node.y + dy };
}
