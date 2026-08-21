import type { NodeId } from "../types/scene";

// The shared id scheme for "a node inside a component instance, addressed
// from outside it" — used by resolveInstance.ts (namespacing a resolved
// subtree so multiple instances of the same definition never collide) and
// by the Layers panel / selection (letting the user select and edit one of
// an instance's definition-local nodes without it being a real graph node).
// A plain generateId() is a UUID and never contains "::", so this is
// unambiguous to parse back apart.
export function makeVirtualId(instanceId: NodeId, defNodeId: NodeId): NodeId {
  return `${instanceId}::${defNodeId}`;
}

export interface VirtualId {
  instanceId: NodeId;
  defNodeId: NodeId;
}

export function parseVirtualId(id: string): VirtualId | null {
  const separatorIndex = id.indexOf("::");
  if (separatorIndex === -1) return null;
  return { instanceId: id.slice(0, separatorIndex), defNodeId: id.slice(separatorIndex + 2) };
}
