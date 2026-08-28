import type { ImageNode } from "@open-canvas/schema";
import { PanelSection, SliderField } from "../fields";

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

  const { blur, brightness, contrast, saturate, grayscale, sepia, hueRotate } = node.filters;

  return (
    <PanelSection title="Effects">
      <SliderField
        label="Blur"
        value={blur}
        displayValue={String(Math.round(blur))}
        min={0}
        max={40}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("blur", value)}
      />
      <SliderField
        label="Brightness"
        value={brightness}
        displayValue={`${Math.round(brightness * 100)}%`}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("brightness", value)}
      />
      <SliderField
        label="Contrast"
        value={contrast}
        displayValue={`${Math.round(contrast * 100)}%`}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("contrast", value)}
      />
      <SliderField
        label="Saturate"
        value={saturate}
        displayValue={`${Math.round(saturate * 100)}%`}
        min={0}
        max={2}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("saturate", value)}
      />
      <SliderField
        label="Grayscale"
        value={grayscale}
        displayValue={`${Math.round(grayscale * 100)}%`}
        min={0}
        max={1}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("grayscale", value)}
      />
      <SliderField
        label="Sepia"
        value={sepia}
        displayValue={`${Math.round(sepia * 100)}%`}
        min={0}
        max={1}
        step={0.05}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("sepia", value)}
      />
      <SliderField
        label="Hue"
        value={hueRotate}
        displayValue={`${Math.round(hueRotate)}°`}
        min={0}
        max={360}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => setFilter("hueRotate", value)}
      />
    </PanelSection>
  );
}
