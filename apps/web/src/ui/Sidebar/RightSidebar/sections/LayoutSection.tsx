import type {
  CrossAxisAlign,
  FlexDirection,
  FrameNode,
  PrimaryAxisAlign,
  SectionNode,
} from "@open-canvas/schema";
import { CheckboxField, NumberField, PanelSection, SelectField } from "../fields";

interface LayoutSectionProps {
  node: FrameNode | SectionNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

const DIRECTIONS = [
  { value: "row", label: "Horizontal" },
  { value: "column", label: "Vertical" },
] as const;

const PRIMARY_AXIS_ALIGNS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "spaceBetween", label: "Space between" },
] as const;

const CROSS_AXIS_ALIGNS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
] as const;

// "Auto layout" toggle mirrors Figma's own affordance: cleaner than a
// none/flex SelectField for a binary on/off. When on, direction/gap/
// padding/alignment become editable — off (the default for every existing
// frame/section) leaves free positioning completely untouched.
export function LayoutSection({ node, onFocus, onChange, onCommit }: LayoutSectionProps) {
  function setLayoutMode(checked: boolean): void {
    onFocus();
    onChange({ layoutMode: checked ? "flex" : "none" });
    onCommit();
  }

  function setDirection(value: FlexDirection): void {
    onFocus();
    onChange({ direction: value });
    onCommit();
  }

  function setPrimaryAxisAlign(value: PrimaryAxisAlign): void {
    onFocus();
    onChange({ primaryAxisAlign: value });
    onCommit();
  }

  function setCrossAxisAlign(value: CrossAxisAlign): void {
    onFocus();
    onChange({ crossAxisAlign: value });
    onCommit();
  }

  // All four sides are linked to one field for now — padding is stored as
  // a full CSS-style box so per-side control can be added later without a
  // schema change, but nothing currently offers a way to set the sides
  // independently.
  function setPadding(value: number): void {
    onChange({ padding: { top: value, right: value, bottom: value, left: value } });
  }

  return (
    <PanelSection title="Layout">
      <CheckboxField label="Auto layout" checked={node.layoutMode === "flex"} onChange={setLayoutMode} />
      {node.layoutMode === "flex" && (
        <>
          <SelectField label="Direction" value={node.direction} options={DIRECTIONS} onChange={setDirection} />
          <NumberField
            label="Gap"
            value={node.gap}
            min={0}
            onFocus={onFocus}
            onCommit={onCommit}
            onChange={(value) => onChange({ gap: value })}
          />
          <NumberField
            label="Padding"
            value={node.padding.top}
            min={0}
            onFocus={onFocus}
            onCommit={onCommit}
            onChange={setPadding}
          />
          <SelectField
            label="Justify content"
            value={node.primaryAxisAlign}
            options={PRIMARY_AXIS_ALIGNS}
            onChange={setPrimaryAxisAlign}
          />
          <SelectField
            label="Align items"
            value={node.crossAxisAlign}
            options={CROSS_AXIS_ALIGNS}
            onChange={setCrossAxisAlign}
          />
        </>
      )}
    </PanelSection>
  );
}
