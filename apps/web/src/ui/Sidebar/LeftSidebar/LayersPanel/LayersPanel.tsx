import { Collapsible } from "@base-ui/react/collapsible";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import { LayerItem } from "./LayerItem";
import styles from "./LayersPanel.module.css";

interface LayersPanelProps {
  scene: SceneGraph;
  selectedIds: Set<NodeId>;
  onSelect: (id: NodeId, additive: boolean) => void;
  onToggleVisible: (id: NodeId) => void;
  onToggleLocked: (id: NodeId) => void;
  onToggleInstanceChildVisible: (instanceId: NodeId, defNodeId: NodeId) => void;
  onRename: (id: NodeId, name: string) => void;
}

export function LayersPanel({
  scene,
  selectedIds,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onToggleInstanceChildVisible,
  onRename,
}: LayersPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const rootIds = [...scene.rootIds].reverse();

  return (
    <Collapsible.Root open={expanded} onOpenChange={setExpanded} className={styles.root}>
      <Collapsible.Trigger className={styles.trigger}>
        <CaretRightIcon size={12} className="collapsible-chevron" data-expanded={expanded || undefined} />
        Layers
      </Collapsible.Trigger>
      <Collapsible.Panel className={styles.panel}>
        {rootIds.length === 0 ? (
          <div className={styles.empty}>No layers yet</div>
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
              onToggleInstanceChildVisible={onToggleInstanceChildVisible}
              onRename={onRename}
            />
          ))
        )}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
