import { useState } from "react";
import type { PageId } from "../../../store/pagesStore";
import type { NodeId, SceneGraph } from "@open-canvas/schema";
import type { ThemePreference } from "../../../store/themeStore";
import { AvatarButton } from "../../AvatarButton/AvatarButton";
import { ElementsPanel } from "./ElementsPanel/ElementsPanel";
import { LayersPanel } from "./LayersPanel/LayersPanel";
import { PagesPanel } from "./PagesPanel/PagesPanel";
import { RailTabs, type RailTab } from "./RailTabs/RailTabs";
import styles from "./LeftSidebar.module.css";

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
  onToggleInstanceChildVisible: (instanceId: NodeId, defNodeId: NodeId) => void;
  onRename: (id: NodeId, name: string) => void;
  accountName: string;
  accountEmail: string;
  accountImage: string | null | undefined;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onOpenProjects: () => void;
  onLogout: () => void;
  projectName: string;
  zoomPercent: number;
}

// Owns the fixed-width bordered column that used to belong solely to
// LayersPanel — account row, project name/zoom, Pages, and a Layers/
// Elements tab switcher all stack above the tab's own content, one page
// at a time (Pages picks which page; Layers/Elements always show that
// page's own tree or the static element library).
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
  onToggleInstanceChildVisible,
  onRename,
  accountName,
  accountEmail,
  accountImage,
  theme,
  onThemeChange,
  onOpenProjects,
  onLogout,
  projectName,
  zoomPercent,
}: LeftSidebarProps) {
  const [railTab, setRailTab] = useState<RailTab>("layers");

  return (
    <div className={styles.root}>
      <div className={styles.accountRow}>
        <span className="wordmark">OPENCANVAS</span>
        <AvatarButton
          name={accountName}
          email={accountEmail}
          image={accountImage}
          theme={theme}
          onThemeChange={onThemeChange}
          onProjects={onOpenProjects}
          onLogout={onLogout}
          compact
        />
      </div>
      <div className={styles.projectRow}>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.zoom}>{zoomPercent}%</span>
      </div>
      <PagesPanel
        pages={pages}
        activePageId={activePageId}
        onSwitch={onSwitchPage}
        onAdd={onAddPage}
        onRename={onRenamePage}
        onDelete={onDeletePage}
      />
      <RailTabs value={railTab} onChange={setRailTab} />
      {railTab === "layers" ? (
        <LayersPanel
          scene={scene}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onToggleVisible={onToggleVisible}
          onToggleLocked={onToggleLocked}
          onToggleInstanceChildVisible={onToggleInstanceChildVisible}
          onRename={onRename}
        />
      ) : (
        <ElementsPanel />
      )}
    </div>
  );
}
