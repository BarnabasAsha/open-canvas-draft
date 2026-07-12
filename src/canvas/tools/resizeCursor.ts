import type { BBoxHandleId, Handle, HandleId } from "./resizeHandles";

const OPPOSITE_HANDLE: Record<BBoxHandleId, BBoxHandleId> = {
  n: "s",
  s: "n",
  e: "w",
  w: "e",
  ne: "sw",
  sw: "ne",
  nw: "se",
  se: "nw",
};

// Derives the cursor from the handle's actual on-screen position relative to
// its opposite handle, rather than assuming n/s is vertical and e/w is
// horizontal — that assumption breaks the moment the node (or an ancestor)
// is rotated, and handle positions already carry that rotation.
export function getResizeCursor(handleId: HandleId, handles: Handle[]): string {
  if (handleId === "start" || handleId === "end") return "crosshair";

  const from = handles.find((handle) => handle.id === handleId);
  const to = handles.find((handle) => handle.id === OPPOSITE_HANDLE[handleId]);
  if (!from || !to) return "default";

  const angle = Math.atan2(to.point.y - from.point.y, to.point.x - from.point.x);
  return angleToCursor(angle);
}

// CSS only has 4 resize-cursor axes, so an arbitrary angle snaps to the
// nearest one (exact for axis-aligned shapes, a reasonable approximation
// otherwise — full per-degree cursor rotation would need a custom cursor
// image, not attempted here).
function angleToCursor(angleRadians: number): string {
  const degrees = (((angleRadians * 180) / Math.PI) % 180 + 180) % 180;
  const cursorsByAxis = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];
  return cursorsByAxis[Math.round(degrees / 45) % 4];
}
