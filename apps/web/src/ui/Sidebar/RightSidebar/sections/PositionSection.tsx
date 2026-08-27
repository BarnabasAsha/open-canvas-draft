import { AngleIcon } from "@phosphor-icons/react";
import type { ArrowNode, LineNode, SceneNode } from "@open-canvas/schema";
import { NumberField, PanelSection } from "../fields";

interface PositionSectionProps {
  node: SceneNode;
  // Only used to detect "is this node a flex-placed flow child" — a flex
  // parent overwrites x/y (and width/height on any hug/fill axis) on every
  // store update, so editing those fields here would silently revert the
  // instant it committed. null for anything without a real parent lookup
  // available (e.g. a virtual instance-child selection).
  parentNode: SceneNode | null;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

function isSegment(node: SceneNode): node is LineNode | ArrowNode {
  return node.type === "line" || node.type === "arrow";
}

function isFlexParent(node: SceneNode | null): boolean {
  return node !== null && (node.type === "frame" || node.type === "section") && node.layoutMode === "flex";
}

// Every node type has x/y/width/height/rotation, but line/arrow are a real
// exception: their rendering is driven entirely by x/y -> x2/y2 (see
// drawLine.ts and resizeMath.ts), so width/height are just a kept-in-sync
// bounding box that editing here would silently do nothing to. X2/Y2 are
// shown instead, and X/Y are wired to move both endpoints together —
// otherwise typing a new X would just stretch the segment by dragging its
// start point, the exact distortion bug drag-move already had to fix once.
export function PositionSection({ node, parentNode, onFocus, onChange, onCommit }: PositionSectionProps) {
  const segment = isSegment(node) ? node : null;

  // A flex parent resolves a flow child's x/y (always) and width/height
  // (whenever that axis isn't "fixed") on every store update — editing a
  // field flex itself controls would just get overwritten right back,
  // with no error to explain why. Disable exactly the fields that would
  // actually be discarded, not the whole section — "fixed"-sized axes and
  // an "absolute" child's position stay fully editable as before.
  const flexControlled = node.positioning === "flow" && isFlexParent(parentNode);
  const widthFlexControlled = flexControlled && node.sizingHorizontal !== "fixed";
  const heightFlexControlled = flexControlled && node.sizingVertical !== "fixed";

  return (
    <PanelSection title="Position">
      <div className="paired-field-grid">
        <NumberField
          label="X"
          value={node.x}
          disabled={flexControlled}
          onFocus={onFocus}
          onCommit={onCommit}
          onChange={(value) => onChange(segment ? { x: value, x2: segment.x2 + (value - segment.x) } : { x: value })}
        />
        <NumberField
          label="Y"
          value={node.y}
          disabled={flexControlled}
          onFocus={onFocus}
          onCommit={onCommit}
          onChange={(value) => onChange(segment ? { y: value, y2: segment.y2 + (value - segment.y) } : { y: value })}
        />
        {segment ? (
          <>
            <NumberField label="X2" value={segment.x2} onFocus={onFocus} onCommit={onCommit} onChange={(value) => onChange({ x2: value })} />
            <NumberField label="Y2" value={segment.y2} onFocus={onFocus} onCommit={onCommit} onChange={(value) => onChange({ y2: value })} />
          </>
        ) : (
          <>
            <NumberField
              label="W"
              value={node.width}
              min={0}
              disabled={widthFlexControlled}
              onFocus={onFocus}
              onCommit={onCommit}
              onChange={(value) => onChange({ width: value })}
            />
            <NumberField
              label="H"
              value={node.height}
              min={0}
              disabled={heightFlexControlled}
              onFocus={onFocus}
              onCommit={onCommit}
              onChange={(value) => onChange({ height: value })}
            />
          </>
        )}
      </div>
      <NumberField
        label={<AngleIcon size={14} />}
        value={node.rotation}
        onFocus={onFocus}
        onCommit={onCommit}
        onChange={(value) => onChange({ rotation: value })}
      />
    </PanelSection>
  );
}
