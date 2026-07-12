import type { SceneNode } from "../types/scene";

interface PropertiesPanelProps {
  node: SceneNode | null;
  selectionCount: number;
}

// Read-only for now — this phase is about the shape tools creating nodes,
// not editing them. Typing a new value into these fields to move/resize a
// node is a natural next step, not attempted here.
export function PropertiesPanel({ node, selectionCount }: PropertiesPanelProps) {
  if (selectionCount === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 200,
        padding: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        fontSize: 12,
        color: "#374151",
      }}
    >
      {selectionCount > 1 || !node ? (
        <Row label="Selected" value={`${selectionCount} objects`} />
      ) : (
        <>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#111827" }}>{node.name}</div>
          <Row label="Type" value={node.type} />
          <Row label="X" value={round(node.x)} />
          <Row label="Y" value={round(node.y)} />
          <Row label="W" value={round(node.width)} />
          <Row label="H" value={round(node.height)} />
          <Row label="Rotation" value={`${round(node.rotation)}°`} />
          <Row label="Opacity" value={`${Math.round(node.opacity * 100)}%`} />
          {getPrimaryColor(node) && <ColorRow label={colorLabel(node)} color={getPrimaryColor(node)!} />}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ColorRow({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            background: color,
          }}
        />
        {color}
      </span>
    </div>
  );
}

function getPrimaryColor(node: SceneNode): string | null {
  switch (node.type) {
    case "rect":
    case "ellipse":
    case "path":
    case "frame":
      return node.fill;
    case "line":
    case "arrow":
      return node.stroke;
    case "text":
      return node.color;
    default:
      return null;
  }
}

function colorLabel(node: SceneNode): string {
  return node.type === "line" || node.type === "arrow" ? "Stroke" : node.type === "text" ? "Color" : "Fill";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
