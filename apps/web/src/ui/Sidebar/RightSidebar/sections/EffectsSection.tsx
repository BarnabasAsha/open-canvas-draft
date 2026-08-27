import type { ImageNode } from "@open-canvas/schema";
import { NumberField, PanelSection } from "../fields";

interface EffectsSectionProps {
  node: ImageNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Every filter field is nested under `filters` on the node. Only the one
// changed key is ever sent — useNodeEdit's onFieldChange deep-merges an
// object-valued patch against the node's CURRENT store state, so this
// never needs (and must never use) its own `node.filters` prop to build
// the replacement value, which could be a render behind the store by the
// time a rapid second field change lands.
export function EffectsSection({ node, onFocus, onChange, onCommit }: EffectsSectionProps) {
  function setFilter(key: keyof ImageNode["filters"], value: number): void {
    onChange({ filters: { [key]: value } });
  }

  return (
    <PanelSection title="Effects">
      <NumberField
        label="Blur"
        value={node.filters.blur}
        min={0}
        max={40}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("blur", value)}
      />
      <NumberField
        label="Brightness"
        value={node.filters.brightness}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("brightness", value)}
      />
      <NumberField
        label="Contrast"
        value={node.filters.contrast}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("contrast", value)}
      />
      <NumberField
        label="Saturate"
        value={node.filters.saturate}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("saturate", value)}
      />
      <NumberField
        label="Grayscale"
        value={node.filters.grayscale}
        min={0}
        max={1}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("grayscale", value)}
      />
      <NumberField
        label="Sepia"
        value={node.filters.sepia}
        min={0}
        max={1}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("sepia", value)}
      />
      <NumberField
        label="Hue rotate"
        value={node.filters.hueRotate}
        min={0}
        max={360}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("hueRotate", value)}
      />
    </PanelSection>
  );
}
