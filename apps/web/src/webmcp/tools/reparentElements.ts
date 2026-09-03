import { createMoveNodeCommand, hasAncestorAmongMembers, isAncestor, reorderChildInGraph, type MoveSnapshot } from "@open-canvas/commands";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { fail, ok, type WebMcpTool } from "../types";

export interface ReparentElementsInput {
  nodeIds: NodeId[];
  newParentId: NodeId | null;
  index?: number;
}

export interface ReparentElementsOutput {
  movedIds: NodeId[];
  newParentId: NodeId | null;
}

function isValidContainer(graph: SceneGraph, id: NodeId): boolean {
  const node = graph.nodes[id];
  return node !== undefined && (node.type === "frame" || node.type === "section" || node.type === "group");
}

// reorderChildInGraph (the pure function this wraps) no-ops silently on an
// invalid move — a cycle, a non-container target, moving a node into
// itself — rather than throwing, so every one of those is checked here
// first for a specific, actionable fail() instead of a confusing "nothing
// happened."
function validate(graph: SceneGraph, nodeIds: NodeId[], newParentId: NodeId | null): string | null {
  for (const nodeId of nodeIds) {
    if (!graph.nodes[nodeId]) return `No element with id ${nodeId}.`;
    if (nodeId === newParentId) return `Can't reparent ${nodeId} into itself.`;
    if (newParentId && isAncestor(graph, nodeId, newParentId)) {
      return `Can't move ${nodeId} into ${newParentId} — ${newParentId} is one of its own descendants.`;
    }
  }
  if (hasAncestorAmongMembers(graph, nodeIds)) {
    return "One of the given nodeIds is an ancestor of another in the same list — move the ancestor on its own first.";
  }
  if (newParentId && !isValidContainer(graph, newParentId)) {
    return `${newParentId} is not a container — newParentId must be a frame, section, or group (or null, to move to the page's root level).`;
  }
  return null;
}

// Moves one or more existing elements into a different container (or to
// the page's root level, via newParentId: null) — the primitive add_element
// alone can't express, since every node it creates lands at the root.
// Undo uses createMoveNodeCommand, not update_element's own SetNode(s)
// pattern: reparenting can add/remove an id from the graph's rootIds array,
// which SetNodeCommand never touches (it only diffs graph.nodes) — see
// MoveNodeCommand.ts's own comment on exactly this bug.
export const reparentElementsTool: WebMcpTool<ReparentElementsInput, ReparentElementsOutput> = {
  name: "reparent_elements",
  description:
    "Move one or more existing elements (by id) into a different frame/section/group, or out to the page's root level (newParentId: null). index places a single element at a specific position among its new siblings (append if omitted); with multiple nodeIds, index is ignored and they're appended in the given order.",
  inputSchema: {
    type: "object",
    properties: {
      nodeIds: { type: "array", items: { type: "string" }, minItems: 1 },
      newParentId: { type: ["string", "null"] },
      index: { type: "number", description: "Only honored when nodeIds has exactly one id." },
    },
    required: ["nodeIds", "newParentId"],
    additionalProperties: false,
  },
  async execute({ nodeIds, newParentId, index }) {
    const before = sceneStore.getState();
    const problem = validate(before, nodeIds, newParentId);
    if (problem) return fail(problem);

    sceneStore.update((graph) =>
      nodeIds.reduce(
        (g, nodeId) => reorderChildInGraph(g, nodeId, newParentId, nodeIds.length === 1 ? index : undefined),
        graph,
      ),
    );
    const after = sceneStore.getState();

    const beforeNodes = new Map<NodeId, SceneNode>();
    const afterNodes = new Map<NodeId, SceneNode>();
    for (const id of Object.keys(after.nodes)) {
      if (after.nodes[id] !== before.nodes[id]) {
        beforeNodes.set(id, before.nodes[id]);
        afterNodes.set(id, after.nodes[id]);
      }
    }
    const rootIdsChanged =
      before.rootIds.length !== after.rootIds.length || before.rootIds.some((id, i) => id !== after.rootIds[i]);
    if (beforeNodes.size === 0 && !rootIdsChanged) {
      return fail("Nothing changed — the target may already be the current parent.");
    }

    const beforeSnapshot: MoveSnapshot = { nodes: beforeNodes, rootIds: before.rootIds };
    const afterSnapshot: MoveSnapshot = { nodes: afterNodes, rootIds: after.rootIds };
    historyManager.execute(createMoveNodeCommand(beforeSnapshot, afterSnapshot));

    return ok({ movedIds: nodeIds, newParentId });
  },
};
