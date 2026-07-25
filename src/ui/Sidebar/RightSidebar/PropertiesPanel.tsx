import type { AlignKind } from "../../../canvas/tools/alignment";
import type { ArrowNode, EllipseNode, FrameNode, LineNode, PathNode, RectNode, SceneNode } from "../../../types/scene";
import { AlignmentToolbar } from "./AlignmentToolbar";
import { AppearanceSection } from "./sections/AppearanceSection";
import { CornerRadiusSection } from "./sections/CornerRadiusSection";
import { DocumentSection } from "./sections/DocumentSection";
import { PositionSection } from "./sections/PositionSection";
import { StrokeSection } from "./sections/StrokeSection";
import { TypographySection } from "./sections/TypographySection";

interface PropertiesPanelProps {
  node: SceneNode | null;
  selectionCount: number;
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  gridVisible: boolean;
  onGridVisibleChange: (visible: boolean) => void;
  rulerVisible: boolean;
  onRulerVisibleChange: (visible: boolean) => void;
  onFieldFocus: () => void;
  onFieldChange: (patch: Record<string, unknown>) => void;
  onFieldCommit: () => void;
  onAlign: (kind: AlignKind) => void;
}

type FillNode = RectNode | EllipseNode | PathNode | FrameNode;
type StrokeNode = RectNode | EllipseNode | PathNode | LineNode | ArrowNode | FrameNode;

function asFillNode(node: SceneNode): FillNode | null {
  return node.type === "rect" || node.type === "ellipse" || node.type === "path" || node.type === "frame" ? node : null;
}

function asStrokeNode(node: SceneNode): StrokeNode | null {
  return node.type === "rect" ||
    node.type === "ellipse" ||
    node.type === "path" ||
    node.type === "line" ||
    node.type === "arrow" ||
    node.type === "frame"
    ? node
    : null;
}

function asCornerRadiusNode(node: SceneNode): RectNode | FrameNode | null {
  return node.type === "rect" || node.type === "frame" ? node : null;
}

// 0 selected: the canvas's own properties (background color), not an
// empty state — this is now a fixed structural column (see App.tsx), so
// hiding its content entirely would waste that space every time selection
// is cleared, and a design tool's canvas has real properties of its own
// (Figma's page background is the same idea). Exactly 1: the full set of
// sections relevant to that node's type. More than 1: a lightweight count
// only — editing shared properties across a heterogeneous multi-selection
// is a real, separate feature (which fields are even shared, batch-command
// semantics) rather than a natural extension of single-node editing, so
// it's deliberately not attempted here.
export function PropertiesPanel({
  node,
  selectionCount,
  backgroundColor,
  onBackgroundColorChange,
  gridVisible,
  onGridVisibleChange,
  rulerVisible,
  onRulerVisibleChange,
  onFieldFocus,
  onFieldChange,
  onFieldCommit,
  onAlign,
}: PropertiesPanelProps) {
  return (
    <div
      style={{
        flex: "0 0 260px",
        height: "100%",
        overflowY: "auto",
        padding: 16,
        background: "var(--surface-panel)",
        borderLeft: "1px solid var(--border)",
        fontSize: 12,
        color: "var(--text)",
      }}
    >
      {selectionCount === 0 ? (
        <DocumentSection
          backgroundColor={backgroundColor}
          onBackgroundColorChange={onBackgroundColorChange}
          gridVisible={gridVisible}
          onGridVisibleChange={onGridVisibleChange}
          rulerVisible={rulerVisible}
          onRulerVisibleChange={onRulerVisibleChange}
        />
      ) : selectionCount > 1 || !node ? (
        <>
          <AlignmentToolbar onAlign={onAlign} />
          <div style={{ padding: "4px 0", color: "var(--text-muted)" }}>{selectionCount} objects selected</div>
        </>
      ) : (
        <PropertySections node={node} onFocus={onFieldFocus} onChange={onFieldChange} onCommit={onFieldCommit} />
      )}
    </div>
  );
}

interface PropertySectionsProps {
  node: SceneNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

function PropertySections({ node, onFocus, onChange, onCommit }: PropertySectionsProps) {
  const fillNode = asFillNode(node);
  const strokeNode = asStrokeNode(node);
  const cornerRadiusNode = asCornerRadiusNode(node);

  return (
    <>
      <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>{node.name}</div>
      <PositionSection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      <AppearanceSection node={node} fillNode={fillNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      {strokeNode && <StrokeSection node={strokeNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {cornerRadiusNode && (
        <CornerRadiusSection node={cornerRadiusNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      )}
      {node.type === "text" && <TypographySection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
    </>
  );
}
