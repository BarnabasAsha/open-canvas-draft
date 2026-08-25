import { Menu } from "@base-ui/react/menu";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { FrameCornersIcon, RowsIcon } from "@phosphor-icons/react";
import type { FramePreset } from "../../canvas/tools/framePresets";
import { FRAME_PRESET_CATEGORIES } from "../../canvas/tools/framePresets";
import type { ToolId } from "../../canvas/tools/toolManager";
import { MenuTriggerIcon } from "./MenuTriggerIcon";

interface StructureMenuProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
  onSelectFramePreset: (preset: FramePreset) => void;
}

const FRAME_ICON = <FrameCornersIcon size={16} />;
const SECTION_ICON = <RowsIcon size={16} />;

// Frame is the one structural tool with more than one way to create it —
// drag one out freehand ("Custom"), or place one already sized to a real
// device — so unlike Section (still a plain click-to-select item), it
// opens its own nested submenu instead of just activating a tool directly.
export function StructureMenu({ activeToolId, onSelectTool, onSelectFramePreset }: StructureMenuProps) {
  const isFrameActive = activeToolId === "frame";
  const isSectionActive = activeToolId === "section";
  const activeIcon = isSectionActive ? SECTION_ICON : FRAME_ICON;

  return (
    <Menu.Root orientation="horizontal">
      <BaseToolbar.Button
        render={<Menu.Trigger />}
        aria-label="Structure tools"
        title="Structure tools"
        className="toolbar-button"
        data-pressed={isFrameActive || isSectionActive ? "" : undefined}
      >
        <MenuTriggerIcon icon={activeIcon} />
      </BaseToolbar.Button>
      <Menu.Portal>
        <Menu.Positioner side="left" sideOffset={8} className="menu-positioner">
          <Menu.Popup className="menu-popup shape-menu-popup">
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger aria-label="Frame (F)" title="Frame (F)" className="menu-item shape-menu-item">
                {FRAME_ICON}
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="start" sideOffset={4} className="menu-positioner">
                  <Menu.Popup className="menu-popup frame-preset-popup">
                    <Menu.Item className="menu-item" onClick={() => onSelectTool("frame")}>
                      Custom
                    </Menu.Item>
                    {FRAME_PRESET_CATEGORIES.map((category) => (
                      <div key={category.category}>
                        <div className="menu-group-label">{category.category}</div>
                        {category.presets.map((preset) => (
                          <Menu.Item
                            key={preset.name}
                            className="menu-item menu-item-with-meta"
                            onClick={() => onSelectFramePreset(preset)}
                          >
                            <span>{preset.name}</span>
                            <span className="menu-item-meta">
                              {preset.width}×{preset.height}
                            </span>
                          </Menu.Item>
                        ))}
                      </div>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Item
              aria-label="Section (Shift+S)"
              title="Section (Shift+S)"
              className="menu-item shape-menu-item"
              onClick={() => onSelectTool("section")}
            >
              {SECTION_ICON}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
