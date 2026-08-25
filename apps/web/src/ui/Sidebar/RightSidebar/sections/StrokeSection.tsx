import type { ArrowNode, EllipseNode, FrameNode, LineNode, PathNode, RectNode, StrokeStyle } from "@open-canvas/schema";
import { ColorField, NumberField, PanelSection, SelectField } from "../fields";

interface StrokeSectionProps {
  node: RectNode | EllipseNode | PathNode | LineNode | ArrowNode | FrameNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

const STROKE_STYLES = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

export function StrokeSection({ node, onFocus, onChange, onCommit }: StrokeSectionProps) {
  // Style has no live-drag concern, so it fires the full focus -> change ->
  // commit sequence in one event, the same as every other SelectField.
  function setStrokeStyle(value: StrokeStyle): void {
    onFocus();
    onChange({ strokeStyle: value });
    onCommit();
  }

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
      <SelectField label="Style" value={node.strokeStyle} options={STROKE_STYLES} onChange={setStrokeStyle} />
    </PanelSection>
  );
}
