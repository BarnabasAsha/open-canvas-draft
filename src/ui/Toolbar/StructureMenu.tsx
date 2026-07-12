import { Menu } from "@base-ui/react/menu";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { FrameCornersIcon, RowsIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { ToolId } from "../../canvas/tools/toolManager";
import { MenuTriggerIcon } from "./MenuTriggerIcon";

interface StructureMenuProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
}

interface StructureToolDefinition {
  id: ToolId;
  label: string;
  icon: ReactNode;
}

const STRUCTURE_TOOLS: StructureToolDefinition[] = [
  { id: "frame", label: "Frame (F)", icon: <FrameCornersIcon size={16} /> },
  { id: "section", label: "Section (Shift+S)", icon: <RowsIcon size={16} /> },
];

// Groups Frame and Section behind one toolbar slot — both are structural,
// non-drawing containers rather than shapes, the same "group the
// conceptually related tools behind a popover" idea ShapeMenu already
// established for the five shape tools.
export function StructureMenu({ activeToolId, onSelectTool }: StructureMenuProps) {
  const activeStructureTool = STRUCTURE_TOOLS.find((tool) => tool.id === activeToolId);

  return (
    <Menu.Root orientation="horizontal">
      <BaseToolbar.Button
        render={<Menu.Trigger />}
        aria-label="Structure tools"
        title="Structure tools"
        className="toolbar-button"
        data-pressed={activeStructureTool ? "" : undefined}
      >
        <MenuTriggerIcon icon={(activeStructureTool ?? STRUCTURE_TOOLS[0]).icon} />
      </BaseToolbar.Button>
      <Menu.Portal>
        <Menu.Positioner side="left" sideOffset={8} className="menu-positioner">
          <Menu.Popup className="menu-popup shape-menu-popup">
            {STRUCTURE_TOOLS.map((tool) => (
              <Menu.Item
                key={tool.id}
                aria-label={tool.label}
                title={tool.label}
                className="menu-item shape-menu-item"
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
