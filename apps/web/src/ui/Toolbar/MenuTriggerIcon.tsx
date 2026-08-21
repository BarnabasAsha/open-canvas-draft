import type { ReactNode } from "react";

interface MenuTriggerIconProps {
  icon: ReactNode;
}

// A small corner indicator is the only thing that tells you a toolbar
// button opens a popover of more options instead of just activating a
// tool directly — without it, ShapeMenu/StructureMenu's trigger looks
// identical to a plain one-shot button like Select or Pen, and there's no
// way to know it's hiding a menu until you click it.
//
// Renders as a sibling of the icon, not nested inside a wrapper sized to
// it — the indicator is positioned against the *button's* own corner (via
// .toolbar-button's position: relative in theme.css), not the icon's
// bounding box, so it reads as a badge on the button rather than a stray
// mark floating near the glyph. See .menu-trigger-caret for why it's a
// plain CSS triangle rather than an icon component.
export function MenuTriggerIcon({ icon }: MenuTriggerIconProps) {
  return (
    <>
      {icon}
      <span className="menu-trigger-caret" />
    </>
  );
}
