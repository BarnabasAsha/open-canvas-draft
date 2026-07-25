import { ColorField, PanelSection } from "../fields";

interface DocumentSectionProps {
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
}

// Shown in place of a node's properties when nothing is selected — the
// canvas itself (like a Figma page) has its own editable properties, not
// just an empty state. Background color writes straight to documentStore,
// no focus/commit batching needed: it's a single direct value, not a
// live-drag-then-commit gesture like a node field. Unchecking it (null)
// makes the canvas transparent — Canvas.tsx renders a checkerboard behind
// it, same convention as any node's nullable fill.
export function DocumentSection({ backgroundColor, onBackgroundColorChange }: DocumentSectionProps) {
  return (
    <>
      <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>Canvas</div>
      <PanelSection title="Appearance">
        <ColorField
          label="Background"
          value={backgroundColor}
          onFocus={() => {}}
          onCommit={() => {}}
          onChange={onBackgroundColorChange}
        />
      </PanelSection>
    </>
  );
}
