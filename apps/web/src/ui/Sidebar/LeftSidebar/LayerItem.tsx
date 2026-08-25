import { Collapsible } from "@base-ui/react/collapsible";
import { CaretRightIcon, EyeClosedIcon, EyeIcon, LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { getComponent } from "../../../store/componentsStore";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import { InstanceChildRow } from "./InstanceChildRow";
import { LayerTypeIcon } from "./LayerTypeIcon";

interface LayerItemProps {
  nodeId: NodeId;
  scene: SceneGraph;
  selectedIds: Set<NodeId>;
  depth: number;
  onSelect: (id: NodeId, additive: boolean) => void;
  onToggleVisible: (id: NodeId) => void;
  onToggleLocked: (id: NodeId) => void;
  onToggleInstanceChildVisible: (instanceId: NodeId, defNodeId: NodeId) => void;
  onRename: (id: NodeId, name: string) => void;
}

// Recurses into its own children for frame/section nodes — the layers
// panel doesn't build a separate tree structure, it just walks the scene
// graph the same way the renderer and hit-tester already do.
export function LayerItem({
  nodeId,
  scene,
  selectedIds,
  depth,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onToggleInstanceChildVisible,
  onRename,
}: LayerItemProps) {
  const [expanded, setExpanded] = useState(true);
  // null = not editing; otherwise the in-progress input value. Seeded from
  // node.name only when editing starts, not at mount, so this doesn't need
  // node to exist yet when the hook is first declared.
  const [editingName, setEditingName] = useState<string | null>(null);
  const node = scene.nodes[nodeId];
  if (!node) return null;

  function commitRename(): void {
    const trimmed = editingName?.trim();
    if (trimmed) onRename(nodeId, trimmed);
    setEditingName(null);
  }

  const isContainer = node.type === "frame" || node.type === "section" || node.type === "group";
  const isSelected = selectedIds.has(nodeId);
  // rootIds/children are drawn in order (later = on top) — reversed here so
  // the topmost layer reads first, matching every other layers panel.
  const childIds = isContainer ? [...node.children].reverse() : [];

  // An instance's "children" aren't real graph nodes — they're whatever the
  // definition it references is built from. Skip past the synthetic
  // wrapper frame componentMutations.ts builds (an implementation detail,
  // not something the user drew) straight to ITS children, so what shows
  // here is exactly the nodes originally selected when the component was
  // created.
  const definition = node.type === "instance" ? getComponent(node.componentId) : undefined;
  const definitionRoot = definition?.nodes[definition.rootId];
  const definitionRootChildIds =
    definitionRoot && (definitionRoot.type === "frame" || definitionRoot.type === "section" || definitionRoot.type === "group")
      ? [...definitionRoot.children].reverse()
      : [];
  const isExpandable = isContainer || definitionRootChildIds.length > 0;

  return (
    <Collapsible.Root open={expanded} onOpenChange={setExpanded}>
      <div
        className="layer-row"
        onClick={(e) => onSelect(nodeId, e.shiftKey)}
        data-selected={isSelected || undefined}
        data-hidden={!node.visible || undefined}
        data-locked={node.locked || undefined}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isExpandable ? (
          <Collapsible.Trigger
            className="icon-button"
            aria-label={expanded ? "Collapse" : "Expand"}
            title={expanded ? "Collapse" : "Expand"}
            onClick={(e) => e.stopPropagation()}
          >
            <CaretRightIcon size={17} className="collapsible-chevron" data-expanded={expanded || undefined} />
          </Collapsible.Trigger>
        ) : (
          <span style={{ width: 26, flexShrink: 0 }} />
        )}
        <span className="layer-row-type-icon">
          <LayerTypeIcon type={node.type} />
        </span>
        {editingName !== null ? (
          <input
            className="layer-row-name-input"
            value={editingName}
            autoFocus
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              else if (e.key === "Escape") setEditingName(null);
            }}
          />
        ) : (
          <span
            className="layer-row-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingName(node.name);
            }}
          >
            {node.name}
          </span>
        )}
        <span className="layer-row-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={node.visible ? "Hide" : "Show"}
            title={node.visible ? "Hide" : "Show"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible(nodeId);
            }}
          >
            {node.visible ? <EyeIcon size={17} /> : <EyeClosedIcon size={17} />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={node.locked ? "Unlock" : "Lock"}
            title={node.locked ? "Unlock" : "Lock"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLocked(nodeId);
            }}
          >
            {node.locked ? <LockSimpleIcon size={17} /> : <LockSimpleOpenIcon size={17} />}
          </button>
        </span>
      </div>
      {isContainer && (
        <Collapsible.Panel>
          {childIds.map((childId) => (
            <LayerItem
              key={childId}
              nodeId={childId}
              scene={scene}
              selectedIds={selectedIds}
              depth={depth + 1}
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              onToggleLocked={onToggleLocked}
              onToggleInstanceChildVisible={onToggleInstanceChildVisible}
              onRename={onRename}
            />
          ))}
        </Collapsible.Panel>
      )}
      {definition && definitionRootChildIds.length > 0 && (
        <Collapsible.Panel>
          {definitionRootChildIds.map((childId) => (
            <InstanceChildRow
              key={childId}
              instanceId={nodeId}
              defNode={definition.nodes[childId]}
              definitionNodes={definition.nodes}
              overrides={node.type === "instance" ? node.overrides : {}}
              depth={depth + 1}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onToggleVisible={onToggleInstanceChildVisible}
            />
          ))}
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  );
}
