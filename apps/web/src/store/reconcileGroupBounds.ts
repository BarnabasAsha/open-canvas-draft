import { getParentOrigin } from "@open-canvas/commands";
import { getGroupBounds } from "../canvas/tools/groupResize";
import type { GroupNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";

// Runs after every graph mutation (see sceneStore.ts) so a Group's own box
// always exactly hugs its children — move/resize/reparent any descendant and
// every group ancestor above it re-fits automatically, with no call site
// needing to know groups exist.
export function reconcileGroupBounds(graph: SceneGraph): SceneGraph {
  const hasGroup = Object.values(graph.nodes).some((node) => node.type === "group");
  if (!hasGroup) return graph;

  let nodes = graph.nodes;
  for (const rootId of graph.rootIds) {
    nodes = reconcileSubtree(nodes, rootId);
  }

  return nodes === graph.nodes ? graph : { ...graph, nodes };
}

// Post-order: a group's own bounds are only recomputed after every node
// beneath it (including any nested group) has already settled, so a nested
// group's freshly-reconciled box is what its parent group measures against.
function reconcileSubtree(nodes: Record<NodeId, SceneNode>, nodeId: NodeId): Record<NodeId, SceneNode> {
  const node = nodes[nodeId];
  if (!node || !("children" in node)) return nodes;

  let next = nodes;
  for (const childId of node.children) {
    next = reconcileSubtree(next, childId);
  }

  if (node.type === "group") {
    next = reconcileOneGroup(next, next[nodeId] as GroupNode);
  }

  return next;
}

function reconcileOneGroup(nodes: Record<NodeId, SceneNode>, group: GroupNode): Record<NodeId, SceneNode> {
  if (group.children.length === 0) return nodes;

  const bounds = getGroupBounds(group.children, nodes);
  if (!bounds) return nodes;

  const parentOrigin = getParentOrigin({ nodes, rootIds: [] }, group.parentId);
  const newX = bounds.minX - parentOrigin.x;
  const newY = bounds.minY - parentOrigin.y;
  const newWidth = bounds.maxX - bounds.minX;
  const newHeight = bounds.maxY - bounds.minY;

  const dx = newX - group.x;
  const dy = newY - group.y;
  if (dx === 0 && dy === 0 && newWidth === group.width && newHeight === group.height) return nodes;

  const next = { ...nodes, [group.id]: { ...group, x: newX, y: newY, width: newWidth, height: newHeight } };

  // Only direct children need compensating — a grandchild's x/y is relative
  // to its own immediate parent, which didn't move.
  for (const childId of group.children) {
    const child = next[childId];
    if (!child) continue;

    if (child.type === "line" || child.type === "arrow") {
      next[childId] = { ...child, x: child.x - dx, y: child.y - dy, x2: child.x2 - dx, y2: child.y2 - dy };
    } else {
      next[childId] = { ...child, x: child.x - dx, y: child.y - dy };
    }
  }

  return next;
}
