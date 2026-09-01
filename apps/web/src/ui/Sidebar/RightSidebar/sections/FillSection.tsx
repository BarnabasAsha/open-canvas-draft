import type { EllipseNode, FrameNode, PathNode, RectNode } from "@open-canvas/schema";
import { ColorField } from "../fields";

interface FillSectionProps {
  node: RectNode | EllipseNode | PathNode | FrameNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Rendered inside AppearanceSection's own PanelSection, not its own —
// a single field needs no subheading of its own, unlike Stroke/Effects
// below it, so the ColorField's own label just reads "Fill" directly.
export function FillSection({ node, onFocus, onChange, onCommit }: FillSectionProps) {
  return (
    <ColorField
      label="Fill"
      value={node.fill}
      onFocus={onFocus}
      onCommit={onCommit}
      onChange={(value) => onChange({ fill: value })}
    />
  );
}
