import { ContextMenu } from "@base-ui/react/context-menu";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useSceneGraph } from "../../canvas/useSceneGraph";
import { useSelection } from "../../canvas/useSelection";
import {
  bringToFront,
  createComponentFromSelection,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  sendToBack,
  ungroupSelection,
} from "../../canvas/selectionActions";

interface NodeContextMenuProps {
  children: ReactNode;
  // Runs on the raw right-click, before the menu's own item-enablement
  // state is computed — the one thing genuinely different between the
  // canvas (needs to hit-test which node was right-clicked) and a layers
  // panel row (already knows its own node) is "what should be selected,"
  // so that's the one thing callers control; the menu's contents and
  // action wiring are otherwise identical in both places.
  onContextMenu?: (e: MouseEvent) => void;
  style?: CSSProperties;
}

// Self-contained like SelectionOverlay/FlexInsertionIndicator already
// are: reads selection/scene state itself and calls straight into
// selectionActions.ts, so neither the canvas nor the layers panel needs
// to prop-drill seven callbacks through to reach this.
export function NodeContextMenu({ children, onContextMenu, style }: NodeContextMenuProps) {
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();

  const selectedIdList = [...selectedIds];
  const hasSelection = selectedIdList.length > 0;
  const canGroup = selectedIdList.length >= 2;
  const soleNode = selectedIdList.length === 1 ? scene.nodes[selectedIdList[0]] : null;
  const canUngroup = soleNode?.type === "group";

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger onContextMenu={onContextMenu} style={style}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="menu-positioner" sideOffset={4}>
          <ContextMenu.Popup className="menu-popup">
            <ContextMenu.Item className="menu-item" disabled={!hasSelection} onClick={duplicateSelection}>
              Duplicate
            </ContextMenu.Item>
            <ContextMenu.Item className="menu-item" disabled={!hasSelection} onClick={deleteSelection}>
              Delete
            </ContextMenu.Item>
            <ContextMenu.Separator className="menu-separator" />
            <ContextMenu.Item className="menu-item" disabled={!canGroup} onClick={groupSelection}>
              Group
            </ContextMenu.Item>
            <ContextMenu.Item className="menu-item" disabled={!canUngroup} onClick={ungroupSelection}>
              Ungroup
            </ContextMenu.Item>
            <ContextMenu.Item className="menu-item" disabled={!hasSelection} onClick={createComponentFromSelection}>
              Create Component
            </ContextMenu.Item>
            <ContextMenu.Separator className="menu-separator" />
            <ContextMenu.Item className="menu-item" disabled={!hasSelection} onClick={bringToFront}>
              Bring to Front
            </ContextMenu.Item>
            <ContextMenu.Item className="menu-item" disabled={!hasSelection} onClick={sendToBack}>
              Send to Back
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
