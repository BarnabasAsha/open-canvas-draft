// Small hand-drawn icons for the toolbar — no icon library dependency for
// eight simple glyphs. All share an 18x18 viewBox and use currentColor so
// they pick up the button's text color (including the active/hover state).

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SelectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M4 2.5L14 9L9.2 10.1L7.5 15L4 2.5Z" fill="currentColor" />
    </svg>
  );
}

export function FrameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <path d="M5 2v3M2 5h3M13 2v3M16 5h-3M5 16v-3M2 13h3M13 16v-3M16 13h-3" />
    </svg>
  );
}

export function SectionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <path d="M2 6h14M2 12h14" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

export function RectangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <rect x="3" y="4.5" width="12" height="9" rx="1.5" />
    </svg>
  );
}

export function EllipseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <circle cx="9" cy="9" r="5.5" />
    </svg>
  );
}

export function LineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <path d="M3 14L15 4" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <path d="M3 14L15 4M15 4v5M15 4h-5" />
    </svg>
  );
}

export function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <path d="M4 4.5h10M9 4.5v9" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" {...STROKE_PROPS}>
      <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
      <circle cx="6.5" cy="7.5" r="1.25" />
      <path d="M4 13.5l4-4 2.5 2.5L14 8.5l0 5" strokeLinejoin="round" />
    </svg>
  );
}
