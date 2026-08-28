import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { CursorIcon, PenNibIcon, TextTIcon } from "@phosphor-icons/react";
import type { UiPrimitiveKind } from "../../canvas/primitives/builtInComponents";
import type { FramePreset } from "../../canvas/tools/framePresets";
import type { ToolId } from "../../canvas/tools/toolManager";
import { PrimitivesMenu } from "./PrimitivesMenu";
import { ShapeMenu } from "./ShapeMenu";
import { StructureMenu } from "./StructureMenu";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  activeToolId: ToolId;
  onSelectTool: (id: ToolId) => void;
  onSelectFramePreset: (preset: FramePreset) => void;
  onSelectPrimitive: (kind: UiPrimitiveKind) => void;
}

const TRAILING_TOOL_IDS: ToolId[] = ["pen", "text"];

// Vertical, floated against the right edge of the canvas (right next to
// the properties panel) rather than centered along the bottom — leaves
// room to grow: a horizontal strip runs out of width fast once you start
// adding more tools, a vertical one just gets taller.
export function Toolbar({ activeToolId, onSelectTool, onSelectFramePreset, onSelectPrimitive }: ToolbarProps) {
  const handleGroupChange = (values: string[]) => {
    const id = values[0] as ToolId | undefined;
    if (id) onSelectTool(id);
  };

  return (
    <BaseToolbar.Root
      orientation="vertical"
      className={styles.toolbar}
      style={{ position: "absolute", top: "50%", right: 18, transform: "translateY(-50%)" }}
    >
      <BaseToolbar.Button
        render={<Toggle pressed={activeToolId === "select"} onPressedChange={() => onSelectTool("select")} />}
        aria-label="Select (V)"
        title="Select (V)"
        className={styles.toolbarButton}
      >
        <CursorIcon size={18} />
      </BaseToolbar.Button>
      <BaseToolbar.Separator className={styles.toolbarSeparator} />
      <StructureMenu activeToolId={activeToolId} onSelectTool={onSelectTool} onSelectFramePreset={onSelectFramePreset} />
      <BaseToolbar.Separator className={styles.toolbarSeparator} />
      <ShapeMenu activeToolId={activeToolId} onSelectTool={onSelectTool} />
      <BaseToolbar.Separator className={styles.toolbarSeparator} />
      <PrimitivesMenu onSelectPrimitive={onSelectPrimitive} />
      <BaseToolbar.Separator className={styles.toolbarSeparator} />
      <ToggleGroup
        orientation="vertical"
        className={styles.toolbarGroup}
        aria-label="Pen and text tools"
        value={TRAILING_TOOL_IDS.includes(activeToolId) ? [activeToolId] : []}
        onValueChange={handleGroupChange}
      >
        <BaseToolbar.Button render={<Toggle />} value="pen" aria-label="Pen (P)" title="Pen (P)" className={styles.toolbarButton}>
          <PenNibIcon size={18} />
        </BaseToolbar.Button>
        <BaseToolbar.Button render={<Toggle />} value="text" aria-label="Text (T)" title="Text (T)" className={styles.toolbarButton}>
          <TextTIcon size={18} />
        </BaseToolbar.Button>
      </ToggleGroup>
    </BaseToolbar.Root>
  );
}
