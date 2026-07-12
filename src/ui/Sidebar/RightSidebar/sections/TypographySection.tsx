import type { TextNode } from "../../../../types/scene";
import { ColorField, NumberField, PanelSection, SelectField } from "../fields";

interface TypographySectionProps {
  node: TextNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

const FONT_FAMILIES = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Georgia", label: "Georgia" },
  { value: "'Courier New'", label: "Courier New" },
] as const;

const FONT_WEIGHTS = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
] as const;

const ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

export function TypographySection({ node, onFocus, onChange, onCommit }: TypographySectionProps) {
  // Select fields have no live-drag concern, so each one just fires the
  // full focus -> change -> commit sequence in a single event.
  function commitField(patch: Record<string, unknown>): void {
    onFocus();
    onChange(patch);
    onCommit();
  }

  return (
    <PanelSection title="Typography">
      <SelectField label="Font" value={node.fontFamily} options={FONT_FAMILIES} onChange={(value) => commitField({ fontFamily: value })} />
      <NumberField
        label="Size"
        value={node.fontSize}
        min={1}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ fontSize: value })}
      />
      <SelectField
        label="Weight"
        value={String(node.fontWeight)}
        options={FONT_WEIGHTS}
        onChange={(value) => commitField({ fontWeight: Number(value) })}
      />
      <SelectField label="Align" value={node.align} options={ALIGNMENTS} onChange={(value) => commitField({ align: value })} />
      <ColorField
        label="Color"
        value={node.color}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ color: value })}
      />
    </PanelSection>
  );
}
