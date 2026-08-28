import { Menu } from "@base-ui/react/menu";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { ArrowUpRightIcon, CircleIcon, ImageIcon, LineSegmentIcon, RectangleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { ToolId } from "../../canvas/tools/toolManager";
import { MenuTriggerIcon } from "./MenuTriggerIcon";
import styles from "./Toolbar.module.css";

interface ShapeMenuProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
}

interface ShapeToolDefinition {
  id: ToolId;
  label: string;
  icon: ReactNode;
}

const SHAPE_TOOLS: ShapeToolDefinition[] = [
  { id: "rectangle", label: "Rectangle (R)", icon: <RectangleIcon size={16} /> },
  { id: "ellipse", label: "Ellipse (O)", icon: <CircleIcon size={16} /> },
  { id: "line", label: "Line (L)", icon: <LineSegmentIcon size={16} /> },
  { id: "arrow", label: "Arrow (A)", icon: <ArrowUpRightIcon size={16} /> },
  { id: "image", label: "Image", icon: <ImageIcon size={16} /> },
];

// Groups the five "draw a shape" tools behind one toolbar slot, Figma-style
// — the trigger shows whichever of the five is currently active (or
// Rectangle, as a stable default). Base UI's Menu handles positioning,
// outside-click/Escape dismissal, and keyboard navigation between items —
// replacing the hand-rolled onBlur/onKeyDown popover from before.
export function ShapeMenu({ activeToolId, onSelectTool }: ShapeMenuProps) {
  const activeShape = SHAPE_TOOLS.find((tool) => tool.id === activeToolId);

  return (
    <Menu.Root orientation="horizontal">
      <BaseToolbar.Button
        render={<Menu.Trigger />}
        aria-label="Shape tools"
        title="Shape tools"
        className={styles.toolbarButton}
        data-pressed={activeShape ? "" : undefined}
      >
        <MenuTriggerIcon icon={(activeShape ?? SHAPE_TOOLS[0]).icon} />
      </BaseToolbar.Button>
      <Menu.Portal>
        <Menu.Positioner side="left" sideOffset={8} className="menu-positioner">
          <Menu.Popup className={`menu-popup ${styles.shapeMenuPopup}`}>
            {SHAPE_TOOLS.map((tool) => (
              <Menu.Item
                key={tool.id}
                aria-label={tool.label}
                title={tool.label}
                className={`menu-item ${styles.shapeMenuItem}`}
                onClick={() => onSelectTool(tool.id)}
              >
                {tool.icon}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
