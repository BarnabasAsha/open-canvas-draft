import type { NodeId } from "../types/scene";

export function generateId(): NodeId {
  return crypto.randomUUID();
}
