import type { FrameNode, RectNode } from "../../../../types/scene";
import { NumberField, PanelSection } from "../fields";

interface CornerRadiusSectionProps {
  node: RectNode | FrameNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

export function CornerRadiusSection({ node, onFocus, onChange, onCommit }: CornerRadiusSectionProps) {
  return (
    <PanelSection title="Corner radius">
      <NumberField
        label="Radius"
        value={node.cornerRadius}
        min={0}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ cornerRadius: value })}
      />
    </PanelSection>
  );
}
