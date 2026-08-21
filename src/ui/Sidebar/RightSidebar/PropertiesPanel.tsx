import { isAlignableContainer } from "../../../canvas/tools/alignment";
import type { AlignKind } from "../../../canvas/tools/alignment";
import type { ArrowNode, EllipseNode, FrameNode, LineNode, PathNode, RectNode, SceneNode } from "../../../types/scene";
import { AlignmentToolbar } from "./AlignmentToolbar";
import { PanelSection } from "./fields";
import { AppearanceSection } from "./sections/AppearanceSection";
import { CornerRadiusSection } from "./sections/CornerRadiusSection";
import { DocumentSection } from "./sections/DocumentSection";
import { PositionSection } from "./sections/PositionSection";
import { SemanticsSection } from "./sections/SemanticsSection";
import { StrokeSection } from "./sections/StrokeSection";
import { TextContentSection } from "./sections/TextContentSection";
import { TypographySection } from "./sections/TypographySection";

interface PropertiesPanelProps {
  node: SceneNode | null;
  selectionCount: number;
  // Set when either 2+ selected nodes share the same type, or exactly one
  // Frame/Section/Group is selected and its own children share a type —
  // one of them, standing in for "the shared style fields that whole set
  // can be batch-edited through" (see SharedPropertySections below).
  uniformNode: SceneNode | null;
  // True when `node` is synthesized from a node INSIDE a component
  // instance's definition, addressed via a virtual id (see
  // instanceVirtualId.ts) rather than a real graph node. Position edits DO
  // work (they become an override, same as any other field) — only the
  // container Align section stays hidden, since aligning a virtual
  // container's children against ITSELF isn't wired up. One known caveat,
  // not fixed here: an override that sets a child's x/y/width/height is
  // stored in the definition's authored coordinate space, so resizing the
  // INSTANCE as a whole after overriding a child's position can scale that
  // override oddly — fine for the common case of styling without also
  // resizing the whole instance in the same session.
  isInstanceChild: boolean;
  backgroundColor: string | null;
  onBackgroundColorChange: (color: string | null) => void;
  gridVisible: boolean;
  onGridVisibleChange: (visible: boolean) => void;
  rulerVisible: boolean;
  onRulerVisibleChange: (visible: boolean) => void;
  onFieldFocus: () => void;
  onFieldChange: (patch: Record<string, unknown>) => void;
  onFieldCommit: () => void;
  // Separate from onField*: uniformNode's fields write to a different set
  // of node ids than `node` itself (the container's children, not the
  // container) whenever both a container and its children's shared
  // section are showing at once.
  onSharedFieldFocus: () => void;
  onSharedFieldChange: (patch: Record<string, unknown>) => void;
  onSharedFieldCommit: () => void;
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
// (Figma's page background is the same idea).
//
// Exactly 1 node selected: the full set of sections relevant to that
// node's type, plus an Align section on top if it's a Frame/Section/Group
// with children (aligning them to itself, Figma-style). If it's a
// container whose children are all the same type, a "Contents" shared
// section is also appended below — selecting the "Nav Links" group and
// setting one font for all three link texts inside it, without needing
// to select those texts directly first.
//
// 2+ selected: an Align section (relative to each other) always shows.
// Below it, a same-type selection also gets the shared *style* fields
// (Appearance/Stroke/Corner radius/Typography) via SharedPropertySections
// so e.g. two Text nodes can have their font/color set together in one
// edit. Position is deliberately excluded even then — batch-setting X/Y
// would collapse every selected node onto the same point, which is never
// what "set the same font for both" actually means; Align already covers
// relative positioning. A heterogeneous selection (mixed types) has no
// well-defined shared schema, so it still falls back to a plain count.
export function PropertiesPanel({
  node,
  selectionCount,
  uniformNode,
  isInstanceChild,
  backgroundColor,
  onBackgroundColorChange,
  gridVisible,
  onGridVisibleChange,
  rulerVisible,
  onRulerVisibleChange,
  onFieldFocus,
  onFieldChange,
  onFieldCommit,
  onSharedFieldFocus,
  onSharedFieldChange,
  onSharedFieldCommit,
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
      ) : selectionCount === 1 && node ? (
        <>
          {!isInstanceChild && isAlignableContainer(node) && (
            <PanelSection title="Align">
              <AlignmentToolbar onAlign={onAlign} />
            </PanelSection>
          )}
          <PropertySections node={node} onFocus={onFieldFocus} onChange={onFieldChange} onCommit={onFieldCommit} />
          {uniformNode && (
            <>
              <div className="panel-section">
                <div className="panel-section-title">Contents</div>
              </div>
              <SharedPropertySections
                node={uniformNode}
                onFocus={onSharedFieldFocus}
                onChange={onSharedFieldChange}
                onCommit={onSharedFieldCommit}
              />
            </>
          )}
        </>
      ) : (
        <>
          <PanelSection title="Align">
            <AlignmentToolbar onAlign={onAlign} />
          </PanelSection>
          {uniformNode ? (
            <SharedPropertySections
              node={uniformNode}
              onFocus={onSharedFieldFocus}
              onChange={onSharedFieldChange}
              onCommit={onSharedFieldCommit}
            />
          ) : (
            <div style={{ padding: "4px 0", color: "var(--text-muted)" }}>{selectionCount} objects selected</div>
          )}
        </>
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
      {node.semantics && <SemanticsSection semantics={node.semantics} />}
      {node.type === "text" && <TextContentSection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      <AppearanceSection node={node} fillNode={fillNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      {strokeNode && <StrokeSection node={strokeNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {cornerRadiusNode && (
        <CornerRadiusSection node={cornerRadiusNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      )}
      {node.type === "text" && <TypographySection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
    </>
  );
}

// Same section set as PropertySections minus Position (see the "2+
// selected" comment above PropertiesPanel for why) and the name header,
// which would misleadingly show only the first selected node's name.
function SharedPropertySections({ node, onFocus, onChange, onCommit }: PropertySectionsProps) {
  const fillNode = asFillNode(node);
  const strokeNode = asStrokeNode(node);
  const cornerRadiusNode = asCornerRadiusNode(node);

  return (
    <>
      {node.semantics && <SemanticsSection semantics={node.semantics} />}
      {node.type === "text" && <TextContentSection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      <AppearanceSection node={node} fillNode={fillNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      {strokeNode && <StrokeSection node={strokeNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
      {cornerRadiusNode && (
        <CornerRadiusSection node={cornerRadiusNode} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />
      )}
      {node.type === "text" && <TypographySection node={node} onFocus={onFocus} onChange={onChange} onCommit={onCommit} />}
    </>
  );
}
