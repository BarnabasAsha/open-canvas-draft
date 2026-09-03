import type { ArrowNode, EllipseNode, FrameNode, ImageNode, LineNode, PathNode, RectNode, SceneNode } from "@open-canvas/schema";
import { NumberField, PanelSection, SliderField } from "../fields";
import { EffectsSection } from "./EffectsSection";
import { FillSection } from "./FillSection";
import { StrokeSection } from "./StrokeSection";

type FillNode = RectNode | EllipseNode | PathNode | FrameNode;
type StrokeNode = RectNode | EllipseNode | PathNode | LineNode | ArrowNode | FrameNode;

interface AppearanceSectionProps {
  node: SceneNode;
  cornerRadiusNode: RectNode | FrameNode | null;
  fillNode: FillNode | null;
  strokeNode: StrokeNode | null;
  imageNode: ImageNode | null;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Everything visual for a node lives in one "Appearance" section, not
// split across several independent ones — explicit design direction,
// deliberately unlike Figma's own panel (which gives Fill/Stroke/Effects
// each their own accordion since it supports multiple stacked fills/
// effects per node). This app only ever has one of each, so there's no
// real content those separate accordions would organize that a single one
// can't just as well; Fill/Stroke/Effects stay their own files below
// (FillSection/StrokeSection/EffectsSection) purely for "one job per
// file," each returning its fields as a fragment rather than wrapping
// itself in its own PanelSection.
//
// Opacity is a BaseNode field applied uniformly to every node type at
// render time (drawNode.ts multiplies globalAlpha by it regardless of
// type), so it's always shown — every other field is type-gated via the
// matching `*Node` prop (null for a type without that field).
export function AppearanceSection({
  node,
  cornerRadiusNode,
  fillNode,
  strokeNode,
  imageNode,
  onFocus,
  onChange,
  onCommit,
}: AppearanceSectionProps) {
  return (
    <PanelSection title="Appearance">
      <SliderField
        label="Opacity"
        value={node.opacity * 100}
        displayValue={`${Math.round(node.opacity * 100)}%`}
        min={0}
        max={100}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ opacity: value / 100 })}
      />
      {cornerRadiusNode && (
        <NumberField
          label="Corner radius"
          value={cornerRadiusNode.cornerRadius}
          min={0}
          onFocus={onFocus}
          onCommit={onCommit}
          onChange={(value) => onChange({ cornerRadius: value })}
        />
      )}
      {fillNode && <FillSection node={fillNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {strokeNode && <StrokeSection node={strokeNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {imageNode && <EffectsSection node={imageNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
    </PanelSection>
  );
}
