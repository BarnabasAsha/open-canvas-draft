import type { EllipseNode, FrameNode, PathNode, RectNode, SceneNode } from "../../../../types/scene";
import { ColorField, NumberField, PanelSection } from "../fields";

interface AppearanceSectionProps {
  node: SceneNode;
  fillNode: RectNode | EllipseNode | PathNode | FrameNode | null;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Opacity is a BaseNode field applied uniformly to every node type at
// render time (drawNode.ts multiplies globalAlpha by it regardless of
// type), so it's always shown here — only the Fill row is type-gated,
// via `fillNode` (null for types with no fill field, e.g. line/text).
export function AppearanceSection({ node, fillNode, onFocus, onChange, onCommit }: AppearanceSectionProps) {
  return (
    <PanelSection title="Appearance">
      {fillNode && (
        <ColorField
          label="Fill"
          value={fillNode.fill}
          onFocus={onFocus}
          onCommit={onCommit}
          onChange={(value) => onChange({ fill: value })}
        />
      )}
      <NumberField
        label="Opacity"
        value={Math.round(node.opacity * 100)}
        min={0}
        max={100}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ opacity: clamp(value, 0, 100) / 100 })}
      />
    </PanelSection>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
