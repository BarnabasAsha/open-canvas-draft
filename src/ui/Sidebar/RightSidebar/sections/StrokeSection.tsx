import type { ArrowNode, EllipseNode, LineNode, PathNode, RectNode } from "../../../../types/scene";
import { ColorField, NumberField, PanelSection } from "../fields";

interface StrokeSectionProps {
  node: RectNode | EllipseNode | PathNode | LineNode | ArrowNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

export function StrokeSection({ node, onFocus, onChange, onCommit }: StrokeSectionProps) {
  return (
    <PanelSection title="Stroke">
      <ColorField
        label="Color"
        value={node.stroke}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ stroke: value })}
      />
      <NumberField
        label="Width"
        value={node.strokeWidth}
        min={0}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ strokeWidth: value })}
      />
    </PanelSection>
  );
}
