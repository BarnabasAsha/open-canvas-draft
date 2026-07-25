import type { SceneGraph } from "../types/scene";

// Scans existing node names for "baseName N" and returns the next free
// number — no counter is persisted anywhere, so renaming or deleting nodes
// can never leave the store out of sync with what's actually on the canvas.
export function nextDefaultName(scene: SceneGraph, baseName: string): string {
  const pattern = new RegExp(`^${baseName} (\\d+)$`);
  let highest = 0;

  for (const node of Object.values(scene.nodes)) {
    const match = pattern.exec(node.name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return `${baseName} ${highest + 1}`;
}
