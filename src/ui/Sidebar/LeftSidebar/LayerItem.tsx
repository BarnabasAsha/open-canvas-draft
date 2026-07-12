import { Collapsible } from "@base-ui/react/collapsible";
import { CaretRightIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon, LockSimpleOpenIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { NodeId, SceneGraph } from "../../../types/scene";

interface LayerItemProps {
  nodeId: NodeId;
  scene: SceneGraph;
  selectedIds: Set<NodeId>;
  depth: number;
  onSelect: (id: NodeId) => void;
  onToggleVisible: (id: NodeId) => void;
  onToggleLocked: (id: NodeId) => void;
}

// Recurses into its own children for frame/section nodes — the layers
// panel doesn't build a separate tree structure, it just walks the scene
// graph the same way the renderer and hit-tester already do.
export function LayerItem({ nodeId, scene, selectedIds, depth, onSelect, onToggleVisible, onToggleLocked }: LayerItemProps) {
  const [expanded, setExpanded] = useState(true);
  const node = scene.nodes[nodeId];
  if (!node) return null;

  const isContainer = node.type === "frame" || node.type === "section";
  const isSelected = selectedIds.has(nodeId);
  // rootIds/children are drawn in order (later = on top) — reversed here so
  // the topmost layer reads first, matching every other layers panel.
  const childIds = isContainer ? [...node.children].reverse() : [];

  return (
    <Collapsible.Root open={expanded} onOpenChange={setExpanded}>
      <div
        className="layer-row"
        onClick={() => onSelect(nodeId)}
        data-selected={isSelected || undefined}
        data-hidden={!node.visible || undefined}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isContainer ? (
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
        <span className="layer-row-name">{node.name}</span>
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
          {node.visible ? <EyeIcon size={17} /> : <EyeSlashIcon size={17} />}
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
            />
          ))}
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  );
}
