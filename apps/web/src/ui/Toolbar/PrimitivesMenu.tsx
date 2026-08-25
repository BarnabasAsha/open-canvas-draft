import { Menu } from "@base-ui/react/menu";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import {
  CaretUpDownIcon,
  CheckSquareIcon,
  LinkIcon,
  RadioButtonIcon,
  RectangleDashedIcon,
  SquaresFourIcon,
  TextboxIcon,
  ToggleLeftIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { UiPrimitiveKind } from "../../canvas/primitives/builtInComponents";

interface PrimitivesMenuProps {
  onSelectPrimitive: (kind: UiPrimitiveKind) => void;
}

interface PrimitiveMenuItem {
  kind: UiPrimitiveKind;
  label: string;
  icon: ReactNode;
}

const PRIMITIVE_ITEMS: PrimitiveMenuItem[] = [
  { kind: "button", label: "Button", icon: <RectangleDashedIcon size={16} /> },
  { kind: "input", label: "Input", icon: <TextboxIcon size={16} /> },
  { kind: "checkbox", label: "Checkbox", icon: <CheckSquareIcon size={16} /> },
  { kind: "radio", label: "Radio", icon: <RadioButtonIcon size={16} /> },
  { kind: "toggle", label: "Toggle", icon: <ToggleLeftIcon size={16} /> },
  { kind: "select", label: "Select", icon: <CaretUpDownIcon size={16} /> },
  { kind: "link", label: "Link", icon: <LinkIcon size={16} /> },
];

// Fire-and-forget inserts, not tool-mode toggles — unlike ShapeMenu, there's
// no "currently active" primitive to reflect on the trigger, since placing
// one immediately switches back to the select tool. The trigger gets its
// own generic "a set of components" icon rather than reusing any one
// item's icon (e.g. Button's) as a stand-in default — otherwise the
// trigger and that one item look identical, which is confusing rather than
// a helpful "here's the default" cue.
export function PrimitivesMenu({ onSelectPrimitive }: PrimitivesMenuProps) {
  return (
    <Menu.Root orientation="horizontal">
      <BaseToolbar.Button render={<Menu.Trigger />} aria-label="Component primitives" title="Component primitives" className="toolbar-button">
        <SquaresFourIcon size={18} />
      </BaseToolbar.Button>
      <Menu.Portal>
        <Menu.Positioner side="left" sideOffset={8} className="menu-positioner">
          <Menu.Popup className="menu-popup shape-menu-popup">
            {PRIMITIVE_ITEMS.map((item) => (
              <Menu.Item
                key={item.kind}
                aria-label={item.label}
                title={item.label}
                className="menu-item shape-menu-item"
                onClick={() => onSelectPrimitive(item.kind)}
              >
                {item.icon}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
