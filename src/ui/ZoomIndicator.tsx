interface ZoomIndicatorProps {
  zoom: number;
  visible: boolean;
  onReset: () => void;
}

// Opacity-based, not conditionally unmounted — a fade feels less abrupt
// than popping in/out, and pointerEvents tracks visibility separately so
// the invisible button doesn't sit there intercepting clicks meant for the
// canvas underneath it.
export function ZoomIndicator({ zoom, visible, onReset }: ZoomIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      title="Reset zoom (Cmd+0)"
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text)",
        background: "var(--surface-panel)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 200ms ease",
      }}
    >
      {Math.round(zoom * 100)}%
    </button>
  );
}
