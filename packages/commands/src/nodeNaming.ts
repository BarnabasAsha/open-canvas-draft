import type { SceneGraph } from "@open-canvas/schema";

// Every prior caller passed a hardcoded literal ("Rect", "Frame", an icon's
// PascalCase name, ...) with no regex-special characters — baseName now
// also carries free-form external text (e.g. an Unsplash photographer's
// name, which can contain "(", ".", "+", etc.), so it needs escaping
// before going into a RegExp or a name like "A.J. (Photos)" would either
// throw (unbalanced parens) or silently match more than intended.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Scans existing node names for "baseName N" and returns the next free
// number — no counter is persisted anywhere, so renaming or deleting nodes
// can never leave the store out of sync with what's actually on the canvas.
export function nextDefaultName(scene: SceneGraph, baseName: string): string {
  const pattern = new RegExp(`^${escapeRegExp(baseName)} (\\d+)$`);
  let highest = 0;

  for (const node of Object.values(scene.nodes)) {
    const match = pattern.exec(node.name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return `${baseName} ${highest + 1}`;
}
