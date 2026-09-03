import { createSetNodeCommand, createSetNodesCommand } from "@open-canvas/commands";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { ANY_PROPERTY_SCHEMA, PROPERTY_SCHEMA_BY_TYPE, type UpdateElementProperties } from "../nodeProperties";
import { fail, ok, type WebMcpTool } from "../types";

export interface UpdateElementInput {
  nodeId: NodeId;
  properties: UpdateElementProperties;
}

// Diffs the WHOLE graph before vs. after, not just the target node — same
// technique useNodeEdit.ts's onFieldCommit uses. sceneStore.update() runs
// resolveFlexLayout/reconcileGroupBounds automatically on every write, and
// a layout/size change can move siblings or children as a side effect that
// has to land in the same undo step, or undo desyncs those nodes' positions.
export const updateElementTool: WebMcpTool<UpdateElementInput, SceneNode> = {
  name: "update_element",
  description:
    "Patch fields on an existing element — fill, stroke, opacity, typography, corner radius, semantics (the HTML tag/role/attributes it exports as, e.g. { tag: \"h1\" } or { tag: \"nav\" } — defaults to a generic div/p/img otherwise), x/y/width/height (x/y/x2/y2 for line/arrow) to move or resize it, or (for a frame/section) its layout config. To move an element into or out of a frame/section/group, use reparent_elements instead — parentId isn't settable here. Only send the fields you're changing. Not every field applies to every node type; sending one that doesn't apply to this node is silently ignored.",
  inputSchema: {
    type: "object",
    properties: {
      nodeId: { type: "string" },
      properties: { type: "object", properties: ANY_PROPERTY_SCHEMA, additionalProperties: false },
    },
    required: ["nodeId", "properties"],
    additionalProperties: false,
  },
  async execute({ nodeId, properties }) {
    const before = sceneStore.getState().nodes;
    const target = before[nodeId];
    if (!target) return fail(`No element with id ${nodeId}.`);

    // Filtered by the TARGET's own type, not the flat cross-type union the
    // schema documents — otherwise a rect-only field like cornerRadius
    // could silently attach itself to a text node it doesn't apply to.
    const allowedKeys = new Set(Object.keys(PROPERTY_SCHEMA_BY_TYPE[target.type]));
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (allowedKeys.has(key)) patch[key] = value;
    }

    // A line/arrow's width/height are derived from its endpoints, never
    // settable directly (same as add_element's buildNode) — recompute them
    // whenever a patch touches x/y/x2/y2, or the node's stored bbox would
    // desync from where it actually renders.
    if ((target.type === "line" || target.type === "arrow") && ["x", "y", "x2", "y2"].some((key) => key in patch)) {
      const x = (patch.x as number | undefined) ?? target.x;
      const y = (patch.y as number | undefined) ?? target.y;
      const x2 = (patch.x2 as number | undefined) ?? target.x2;
      const y2 = (patch.y2 as number | undefined) ?? target.y2;
      patch.width = Math.abs(x2 - x);
      patch.height = Math.abs(y2 - y);
    }

    sceneStore.update((graph) => ({ ...graph, nodes: { ...graph.nodes, [nodeId]: { ...graph.nodes[nodeId], ...patch } } }));
    const after = sceneStore.getState().nodes;

    const beforeMap = new Map<NodeId, SceneNode>();
    const afterMap = new Map<NodeId, SceneNode>();
    for (const id of Object.keys(after)) {
      if (after[id] !== before[id]) {
        beforeMap.set(id, before[id]);
        afterMap.set(id, after[id]);
      }
    }
    if (afterMap.size === 0) return ok(after[nodeId]);

    // Re-applying an already-live change via the command below looks
    // redundant but isn't a bug — Set(Node|Nodes)Command.apply() sets nodes
    // to a fixed target state, so it's idempotent against a store already
    // at that state. This is the exact same order useNodeEdit.ts's
    // onFieldCommit already uses: write live for immediate feedback, then
    // execute a command capturing before/after purely for undo bookkeeping.
    //
    // A single-node change (the common case) still gets its own command
    // type — matches how the properties panel commits a plain field edit —
    // falling back to the plural command only when the reflow actually
    // touched more than one node.
    historyManager.execute(
      afterMap.size === 1
        ? createSetNodeCommand(nodeId, before[nodeId], after[nodeId])
        : createSetNodesCommand(beforeMap, afterMap),
    );

    return ok(sceneStore.getState().nodes[nodeId]);
  },
};
