import { Collapsible } from "@base-ui/react/collapsible";
import { CaretRightIcon, EyeClosedIcon, EyeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { makeVirtualId } from "@open-canvas/commands";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import { LayerTypeIcon } from "./LayerTypeIcon";

interface InstanceChildRowProps {
  instanceId: NodeId;
  defNode: SceneNode;
  definitionNodes: Record<NodeId, SceneNode>;
  overrides: Record<NodeId, Partial<SceneNode>>;
  depth: number;
  selectedIds: Set<NodeId>;
  onSelect: (id: NodeId, additive: boolean) => void;
  onToggleVisible: (instanceId: NodeId, defNodeId: NodeId) => void;
}

// A browse-and-select row for one node INSIDE a component definition,
// shown nested under its instance in the Layers panel. No rename affordance
// (that belongs to the shared definition, not this one instance) — but
// visibility DOES work, writing a `visible` override rather than flipping a
// real node's own field. This is how Checkbox/Radio/Toggle's "on" state
// actually works now: showing the Check/Dot is just toggling this same eye
// icon on the right child, not a bespoke checked flag. Selecting a row lets
// the properties panel edit its restyle-able fields via overrides too (see
// useInstanceOverrideEdit.ts) — position/size included, with one accepted
// caveat: those coordinates live in the definition's authored space, so
// resizing the INSTANCE as a whole after overriding a child's position can
// scale that override unexpectedly.
export function InstanceChildRow({
  instanceId,
  defNode,
  definitionNodes,
  overrides,
  depth,
  selectedIds,
  onSelect,
  onToggleVisible,
}: InstanceChildRowProps) {
  const [expanded, setExpanded] = useState(true);
  const virtualId = makeVirtualId(instanceId, defNode.id);
  const isContainer = defNode.type === "frame" || defNode.type === "section" || defNode.type === "group";
  const childIds = isContainer ? [...defNode.children].reverse() : [];
  const isSelected = selectedIds.has(virtualId);

  const override = overrides[defNode.id] as { visible?: boolean } | undefined;
  const visible = override?.visible ?? defNode.visible;

  return (
    <Collapsible.Root open={expanded} onOpenChange={setExpanded}>
      <div
        className="layer-row"
        onClick={(e) => onSelect(virtualId, e.shiftKey)}
        data-selected={isSelected || undefined}
        data-hidden={!visible || undefined}
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
        <span className="layer-row-type-icon">
          <LayerTypeIcon type={defNode.type} />
        </span>
        <span className="layer-row-name">{defNode.name}</span>
        <span className="layer-row-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? "Hide" : "Show"}
            title={visible ? "Hide" : "Show"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible(instanceId, defNode.id);
            }}
          >
            {visible ? <EyeIcon size={17} /> : <EyeClosedIcon size={17} />}
          </button>
        </span>
      </div>
      {isContainer && (
        <Collapsible.Panel>
          {childIds.map((childId) => (
            <InstanceChildRow
              key={childId}
              instanceId={instanceId}
              defNode={definitionNodes[childId]}
              definitionNodes={definitionNodes}
              overrides={overrides}
              depth={depth + 1}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
            />
          ))}
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  );
}
