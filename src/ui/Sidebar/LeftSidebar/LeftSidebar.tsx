import type { PageId } from "../../../store/pagesStore";
import type { NodeId, SceneGraph } from "../../../types/scene";
import { LayersPanel } from "./LayersPanel";
import { PagesPanel } from "./PagesPanel";

interface PageSummary {
  id: PageId;
  name: string;
}

interface LeftSidebarProps {
  pages: PageSummary[];
  activePageId: PageId;
  onSwitchPage: (id: PageId) => void;
  onAddPage: () => void;
  onRenamePage: (id: PageId, name: string) => void;
  onDeletePage: (id: PageId) => void;
  scene: SceneGraph;
  selectedIds: Set<NodeId>;
  onSelect: (id: NodeId, additive: boolean) => void;
  onToggleVisible: (id: NodeId) => void;
  onToggleLocked: (id: NodeId) => void;
  onRename: (id: NodeId, name: string) => void;
}

// Owns the fixed-width bordered column that used to belong solely to
// LayersPanel — Pages sits above Layers within it, both scoped to one page
// at a time (Pages picks which page; Layers always shows that page's tree).
export function LeftSidebar({
  pages,
  activePageId,
  onSwitchPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  scene,
  selectedIds,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
}: LeftSidebarProps) {
  return (
    <div
      style={{
        flex: "0 0 240px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface-panel)",
        borderRight: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <PagesPanel
        pages={pages}
        activePageId={activePageId}
        onSwitch={onSwitchPage}
        onAdd={onAddPage}
        onRename={onRenamePage}
        onDelete={onDeletePage}
      />
      <LayersPanel
        scene={scene}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onToggleVisible={onToggleVisible}
        onToggleLocked={onToggleLocked}
        onRename={onRename}
      />
    </div>
  );
}
