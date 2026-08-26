import type { PositioningMode, SceneNode, SizingMode } from "@open-canvas/schema";
import { PanelSection, SelectField } from "../fields";

interface FlexChildSectionProps {
  node: SceneNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

const POSITIONING_OPTIONS = [
  { value: "flow", label: "Flow" },
  { value: "absolute", label: "Absolute" },
] as const;

const SIZING_OPTIONS: readonly { value: SizingMode; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "hug", label: "Hug" },
  { value: "fill", label: "Fill" },
];

// Group's own bounds are continuously re-fit to hug its children
// (reconcileGroupBounds.ts) regardless of what a flex parent assigns it —
// offering "hug"/"fill" here would silently do nothing the next update
// cycle, so a Group child only ever gets "fixed" (which, for a Group,
// still just means "positioned by the flex parent, sized by its children
// as always").
function sizingOptionsFor(node: SceneNode): readonly { value: SizingMode; label: string }[] {
  if (node.type === "group") return SIZING_OPTIONS.filter((option) => option.value === "fixed");
  // "Hug" only means something for a node with its own content/children
  // to derive a size from — a leaf shape has nothing to hug.
  if (!("children" in node)) return SIZING_OPTIONS.filter((option) => option.value !== "hug");
  return SIZING_OPTIONS;
}

// Shown for a node whose parent is a flex-mode Frame/Section, letting it
// opt out of the flow entirely ("absolute", same free positioning as
// today) or declare how it should be sized along each axis.
export function FlexChildSection({ node, onFocus, onChange, onCommit }: FlexChildSectionProps) {
  const options = sizingOptionsFor(node);

  function setPositioning(value: PositioningMode): void {
    onFocus();
    onChange({ positioning: value });
    onCommit();
  }

  function setSizingHorizontal(value: SizingMode): void {
    onFocus();
    onChange({ sizingHorizontal: value });
    onCommit();
  }

  function setSizingVertical(value: SizingMode): void {
    onFocus();
    onChange({ sizingVertical: value });
    onCommit();
  }

  return (
    <PanelSection title="Flex child">
      <SelectField label="Position" value={node.positioning} options={POSITIONING_OPTIONS} onChange={setPositioning} />
      {node.positioning === "flow" && (
        <>
          <SelectField label="Width" value={node.sizingHorizontal} options={options} onChange={setSizingHorizontal} />
          <SelectField label="Height" value={node.sizingVertical} options={options} onChange={setSizingVertical} />
        </>
      )}
    </PanelSection>
  );
}
