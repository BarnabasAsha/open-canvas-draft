import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { CursorIcon, PenNibIcon, TextTIcon } from "@phosphor-icons/react";
import type { FramePreset } from "../../canvas/tools/framePresets";
import type { ToolId } from "../../canvas/tools/toolManager";
import { ShapeMenu } from "./ShapeMenu";
import { StructureMenu } from "./StructureMenu";

interface ToolbarProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
  onSelectFramePreset: (preset: FramePreset) => void;
}

const TRAILING_TOOL_IDS: ToolId[] = ["pen", "text"];

// Vertical, floated against the right edge of the canvas (right next to
// the properties panel) rather than centered along the bottom — leaves
// room to grow: a horizontal strip runs out of width fast once you start
// adding more tools, a vertical one just gets taller.
export function Toolbar({ activeToolId, onSelectTool, onSelectFramePreset }: ToolbarProps) {
  const handleGroupChange = (values: string[]) => {
    const id = values[0] as ToolId | undefined;
    if (id) onSelectTool(id);
  };

  return (
    <BaseToolbar.Root
      orientation="vertical"
      className="toolbar"
      style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)" }}
    >
      <BaseToolbar.Button
        render={<Toggle pressed={activeToolId === "select"} onPressedChange={() => onSelectTool("select")} />}
        aria-label="Select (V)"
        title="Select (V)"
        className="toolbar-button"
      >
        <CursorIcon size={18} />
      </BaseToolbar.Button>
      <BaseToolbar.Separator className="toolbar-separator" />
      <StructureMenu activeToolId={activeToolId} onSelectTool={onSelectTool} onSelectFramePreset={onSelectFramePreset} />
      <BaseToolbar.Separator className="toolbar-separator" />
      <ShapeMenu activeToolId={activeToolId} onSelectTool={onSelectTool} />
      <BaseToolbar.Separator className="toolbar-separator" />
      <ToggleGroup
        orientation="vertical"
        className="toolbar-group"
        aria-label="Pen and text tools"
        value={TRAILING_TOOL_IDS.includes(activeToolId) ? [activeToolId] : []}
        onValueChange={handleGroupChange}
      >
        <BaseToolbar.Button render={<Toggle />} value="pen" aria-label="Pen (P)" title="Pen (P)" className="toolbar-button">
          <PenNibIcon size={18} />
        </BaseToolbar.Button>
        <BaseToolbar.Button render={<Toggle />} value="text" aria-label="Text (T)" title="Text (T)" className="toolbar-button">
          <TextTIcon size={18} />
        </BaseToolbar.Button>
      </ToggleGroup>
    </BaseToolbar.Root>
  );
}
