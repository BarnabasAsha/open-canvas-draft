import type { NodeId } from "@open-canvas/schema";
import { v7 as uuidv7 } from "uuid";

// v7 (not v4/random) so ids embed a millisecond timestamp prefix and sort
// by creation order — useful once real database storage is in the picture.
export function generateId(): NodeId {
  return uuidv7();
}
