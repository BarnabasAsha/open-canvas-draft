import { Collapsible } from "@base-ui/react/collapsible";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { NodeId, SceneGraph } from "../../../types/scene";
import { LayerItem } from "./LayerItem";

interface LayersPanelProps {
  scene: SceneGraph;
  selectedIds: Set<NodeId>;
  onSelect: (id: NodeId, additive: boolean) => void;
  onToggleVisible: (id: NodeId) => void;
  onToggleLocked: (id: NodeId) => void;
  onRename: (id: NodeId, name: string) => void;
}

export function LayersPanel({ scene, selectedIds, onSelect, onToggleVisible, onToggleLocked, onRename }: LayersPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const rootIds = [...scene.rootIds].reverse();

  return (
    <Collapsible.Root
      open={expanded}
      onOpenChange={setExpanded}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Collapsible.Trigger className="collapsible-trigger">
        <CaretRightIcon size={14} className="collapsible-chevron" data-expanded={expanded || undefined} />
        Layers
      </Collapsible.Trigger>
      <Collapsible.Panel style={{ flex: 1, overflowY: "auto", paddingBottom: 6 }}>
        {rootIds.length === 0 ? (
          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>No layers yet</div>
        ) : (
          rootIds.map((id) => (
            <LayerItem
              key={id}
              nodeId={id}
              scene={scene}
              selectedIds={selectedIds}
              depth={0}
              onSelect={onSelect}
              onToggleVisible={onToggleVisible}
              onToggleLocked={onToggleLocked}
              onRename={onRename}
            />
          ))
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
