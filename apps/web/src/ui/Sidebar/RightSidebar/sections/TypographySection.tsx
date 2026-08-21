import type { TextNode } from "@open-canvas/schema";
import { GOOGLE_FONTS, loadGoogleFont } from "../../../../utils/googleFonts";
import { ColorField, NumberField, PanelSection, SelectField } from "../fields";

interface TypographySectionProps {
  node: TextNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// The five generic entries need no network fetch at all — real fonts
// already available to every browser. Google Fonts are loaded on demand
// (see handleFontChange below), not all fetched up front just for being
// listed here.
const FONT_FAMILIES = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Georgia", label: "Georgia" },
  { value: "'Courier New'", label: "Courier New" },
  ...GOOGLE_FONTS.map((family) => ({ value: family, label: family })),
] as const;

const FONT_WEIGHTS = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
] as const;

const FONT_STYLES = [
  { value: "normal", label: "Regular" },
  { value: "italic", label: "Italic" },
] as const;

const TEXT_DECORATIONS = [
  { value: "none", label: "None" },
  { value: "underline", label: "Underline" },
  { value: "line-through", label: "Strikethrough" },
] as const;

const ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const;

const GOOGLE_FONT_SET: ReadonlySet<string> = new Set(GOOGLE_FONTS);

export function TypographySection({ node, onFocus, onChange, onCommit }: TypographySectionProps) {
  // Select fields have no live-drag concern, so each one just fires the
  // full focus -> change -> commit sequence in a single event.
  function commitField(patch: Record<string, unknown>): void {
    onFocus();
    onChange(patch);
    onCommit();
  }

  function handleFontChange(value: string): void {
    if (GOOGLE_FONT_SET.has(value)) loadGoogleFont(value);
    commitField({ fontFamily: value });
  }

  return (
    <PanelSection title="Typography">
      <SelectField label="Font" value={node.fontFamily} options={FONT_FAMILIES} onChange={handleFontChange} />
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
      <SelectField label="Style" value={node.fontStyle} options={FONT_STYLES} onChange={(value) => commitField({ fontStyle: value })} />
      <NumberField
        label="Line height"
        value={node.lineHeight}
        min={0.5}
        step={0.1}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ lineHeight: value })}
      />
      <NumberField
        label="Letter spacing"
        value={node.letterSpacing}
        step={0.1}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ letterSpacing: value })}
      />
      <SelectField
        label="Decoration"
        value={node.textDecoration}
        options={TEXT_DECORATIONS}
        onChange={(value) => commitField({ textDecoration: value })}
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
