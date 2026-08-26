import type { ComponentDefinition } from "./componentTypes";
import { collectWithDescendants, getParentOrigin, isAncestor, reparentNodeInGraph } from "./graphMutations";
import { generateId } from "./id";
import type { Bounds } from "./sceneCorners";
import { getGroupBounds } from "./sceneCorners";
import type { Point } from "./worldTransform";
import type { ArrowNode, FrameNode, LineNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";

export interface ComponentSnapshot {
  definition: ComponentDefinition;
  bounds: Bounds;
}

// Pure: builds a saved, reusable ComponentDefinition from a live selection
// without touching the real graph — the caller registers the result into
// componentsStore and separately executes a normal (undoable) Command that
// swaps the selection for an instance, mirroring GroupNodesCommand's shape
// but split across two stores instead of one.
export function createComponentDefinition(graph: SceneGraph, memberIds: NodeId[], name: string): ComponentSnapshot | null {
  if (memberIds.length === 0 || hasAncestorAmongMembers(graph, memberIds)) return null;

  const bounds = getGroupBounds(memberIds, graph.nodes);
  if (!bounds) return null;

  const memberIdSet = new Set(memberIds);
  const idsToClone = collectWithDescendants(graph, memberIds);
  const idMap = new Map<NodeId, NodeId>();
  for (const id of idsToClone) idMap.set(id, generateId());

  const clonedNodes: Record<NodeId, SceneNode> = {};
  for (const oldId of idsToClone) {
    const original = graph.nodes[oldId];
    const newId = idMap.get(oldId)!;
    clonedNodes[newId] = memberIdSet.has(oldId)
      ? cloneTopLevelMember(original, newId, sceneOrigin(graph, original), idMap)
      : cloneDescendant(original, newId, idMap);
  }

  const rootId = generateId();
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const rootNode = buildDefinitionRoot(rootId, name, bounds, width, height);

  // Reuses reparentNodeInGraph for the exact same "shift by parent-origin
  // difference" math GroupNodesCommand relies on — the cloned members are
  // parked at parentId: null with their true SCENE-space position (see
  // sceneOrigin below), so the shift this computes lands them at the
  // correct LOCAL position under rootNode without re-deriving that math.
  let scratch: SceneGraph = {
    nodes: { ...clonedNodes, [rootId]: rootNode },
    rootIds: [rootId, ...memberIds.map((id) => idMap.get(id)!)],
  };
  for (const oldMemberId of memberIds) {
    scratch = reparentNodeInGraph(scratch, idMap.get(oldMemberId)!, rootId);
  }

  const definition: ComponentDefinition = {
    id: generateId(),
    name,
    width,
    height,
    rootId,
    nodes: scratch.nodes,
  };

  return { definition, bounds };
}

function hasAncestorAmongMembers(graph: SceneGraph, memberIds: NodeId[]): boolean {
  for (const a of memberIds) {
    for (const b of memberIds) {
      if (a !== b && isAncestor(graph, a, b)) return true;
    }
  }
  return false;
}

// Where a member's local (0,0) actually sits in scene space today — the
// same quantity getParentOrigin + node.x/y already stands in for elsewhere
// in this codebase (e.g. graphMutations.ts's own reparent shift).
function sceneOrigin(graph: SceneGraph, node: SceneNode): Point {
  const parentOrigin = getParentOrigin(graph, node.parentId);
  return { x: parentOrigin.x + node.x, y: parentOrigin.y + node.y };
}

function cloneTopLevelMember(original: SceneNode, newId: NodeId, origin: Point, idMap: Map<NodeId, NodeId>): SceneNode {
  const remapped = remapChildrenAndParent(original, newId, null, idMap);
  if (original.type === "line" || original.type === "arrow") {
    const dx = origin.x - original.x;
    const dy = origin.y - original.y;
    return { ...(remapped as LineNode | ArrowNode), x: origin.x, y: origin.y, x2: original.x2 + dx, y2: original.y2 + dy };
  }
  return { ...remapped, x: origin.x, y: origin.y };
}

function cloneDescendant(original: SceneNode, newId: NodeId, idMap: Map<NodeId, NodeId>): SceneNode {
  const remappedParentId = original.parentId ? (idMap.get(original.parentId) ?? null) : null;
  return remapChildrenAndParent(original, newId, remappedParentId, idMap);
}

function remapChildrenAndParent(original: SceneNode, newId: NodeId, parentId: NodeId | null, idMap: Map<NodeId, NodeId>): SceneNode {
  const base = { ...original, id: newId, parentId };
  if (base.type === "frame" || base.type === "section" || base.type === "group") {
    return { ...base, children: base.children.map((childId) => idMap.get(childId) ?? childId) };
  }
  return base;
}

function buildDefinitionRoot(id: NodeId, name: string, bounds: Bounds, width: number, height: number): FrameNode {
  return {
    id,
    type: "frame",
    name,
    parentId: null,
    x: bounds.minX,
    y: bounds.minY,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    fill: null,
    stroke: null,
    strokeWidth: 0,
    strokeStyle: "solid",
    clipsContent: false,
    cornerRadius: 0,
    layoutMode: "none",
    direction: "row",
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAxisAlign: "start",
    crossAxisAlign: "start",
    children: [],
  };
}
