import type { ComponentDefinition } from "./componentTypes";
import { makeVirtualId } from "./instanceVirtualId";
import { scalePathPoints } from "./pathScaling";
import type { InstanceNode, NodeId, SceneNode } from "@open-canvas/schema";

export interface ResolvedSubtree {
  rootId: NodeId;
  nodes: Record<NodeId, SceneNode>;
}

// Pure data-in/data-out: resolves an instance's overrides and scale into a
// concrete subtree, shaped exactly like SceneGraph.nodes so the existing
// drawNode/hitTestScene recursion — and, later, an HTML/React exporter —
// can walk it with no special cases. Ids are namespaced per-instance (see
// instanceVirtualId.ts) so multiple instances of the same definition never
// collide, and so a resolved id is traceable back to (instance, defNodeId)
// — the same scheme the Layers panel uses to let you select into one.
export function resolveInstance(instance: InstanceNode, definition: ComponentDefinition): ResolvedSubtree {
  const scaleX = definition.width === 0 ? 1 : instance.width / definition.width;
  const scaleY = definition.height === 0 ? 1 : instance.height / definition.height;

  const idMap = new Map<NodeId, NodeId>();
  for (const id of Object.keys(definition.nodes)) idMap.set(id, makeVirtualId(instance.id, id));

  const nodes: Record<NodeId, SceneNode> = {};
  for (const [defNodeId, resolvedId] of idMap) {
    const original = definition.nodes[defNodeId];
    const override = instance.overrides[defNodeId];
    const remappedParentId = original.parentId ? (idMap.get(original.parentId) ?? null) : null;

    let node = { ...original, ...override, id: resolvedId, parentId: remappedParentId } as SceneNode;
    if (node.type === "frame" || node.type === "section" || node.type === "group") {
      node = { ...node, children: node.children.map((childId) => idMap.get(childId) ?? childId) };
    }

    nodes[resolvedId] = defNodeId === definition.rootId ? placeRoot(node, instance) : scaleChild(node, scaleX, scaleY);
  }

  return { rootId: idMap.get(definition.rootId)!, nodes };
}

// The outer drawNode/hitTest call for the INSTANCE itself already applied
// instance.x/y/rotation to the canvas transform (or, for hit-testing,
// already walked the instance's own ancestor chain) — the resolved root
// renders in that already-instance-local frame, so it sits at (0,0), not
// at instance.x/y again (which would double-translate).
function placeRoot(node: SceneNode, instance: InstanceNode): SceneNode {
  return { ...node, x: 0, y: 0, rotation: 0, width: instance.width, height: instance.height };
}

// Every node in the resolved subtree scales by the same uniform factor —
// mirrors groupResize.ts's scaleNodeLocally (a node whose parent is scaling
// this same gesture just multiplies its own local x/y/width/height, since
// the anchor term cancels out algebraically), reusing scalePathPoints
// directly rather than re-deriving path-scaling math.
function scaleChild(node: SceneNode, scaleX: number, scaleY: number): SceneNode {
  if (node.type === "line" || node.type === "arrow") {
    const x = node.x * scaleX;
    const y = node.y * scaleY;
    const x2 = node.x2 * scaleX;
    const y2 = node.y2 * scaleY;
    return { ...node, x, y, x2, y2, width: Math.abs(x2 - x), height: Math.abs(y2 - y) };
  }

  const scaled = { ...node, x: node.x * scaleX, y: node.y * scaleY, width: node.width * scaleX, height: node.height * scaleY };
  return scaled.type === "path" ? { ...scaled, points: scalePathPoints(scaled.points, scaleX, scaleY) } : scaled;
}
