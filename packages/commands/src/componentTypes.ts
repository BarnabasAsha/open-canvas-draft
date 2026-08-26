import type { ComponentId, InstanceNode, NodeId, SceneNode } from "@open-canvas/schema";

// A saved, reusable composition — structurally identical to a SceneGraph
// (nodes keyed by id) but with a single root rather than an array of root
// ids, since a component definition is always one thing. The live registry
// of these (componentsStore.ts) stays in apps/web — this is just the
// portable shape resolveInstance.ts and componentMutations.ts operate on.
export interface ComponentDefinition {
  id: ComponentId;
  name: string;
  width: number;
  height: number;
  rootId: NodeId;
  nodes: Record<NodeId, SceneNode>;
}

// One place that builds an InstanceNode from a definition — used both when
// placing a fresh built-in primitive and when "Create Component" replaces a
// selection with an instance (CreateComponentInstanceCommand), so the two
// flows can't drift apart on what an instance's starting fields should be.
export function createInstanceNode(
  id: NodeId,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  definition: ComponentDefinition,
): InstanceNode {
  return {
    id,
    type: "instance",
    name,
    parentId: null,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: definition.nodes[definition.rootId]?.semantics ?? null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    componentId: definition.id,
    overrides: {},
  };
}
