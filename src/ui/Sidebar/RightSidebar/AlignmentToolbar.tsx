import {
  AlignBottomIcon,
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { AlignKind } from "../../../canvas/tools/alignment";

interface AlignButtonDefinition {
  kind: AlignKind;
  label: string;
  icon: ReactNode;
}

const ALIGN_BUTTONS: AlignButtonDefinition[] = [
  { kind: "left", label: "Align left", icon: <AlignLeftIcon size={16} /> },
  { kind: "centerH", label: "Align center horizontally", icon: <AlignCenterHorizontalIcon size={16} /> },
  { kind: "right", label: "Align right", icon: <AlignRightIcon size={16} /> },
  { kind: "top", label: "Align top", icon: <AlignTopIcon size={16} /> },
  { kind: "centerV", label: "Align center vertically", icon: <AlignCenterVerticalIcon size={16} /> },
  { kind: "bottom", label: "Align bottom", icon: <AlignBottomIcon size={16} /> },
];

interface AlignmentToolbarProps {
  onAlign: (kind: AlignKind) => void;
}

export function AlignmentToolbar({ onAlign }: AlignmentToolbarProps) {
  return (
    <div className="align-toolbar">
      {ALIGN_BUTTONS.map((button) => (
        <button
          key={button.kind}
          type="button"
          className="icon-button"
          aria-label={button.label}
          title={button.label}
          onClick={() => onAlign(button.kind)}
        >
          {button.icon}
        </button>
      ))}
    </div>
  );
}
