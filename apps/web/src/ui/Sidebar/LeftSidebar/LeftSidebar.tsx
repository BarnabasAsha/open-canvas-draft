import { useState } from "react";
import type { Asset } from "../../../lib/assets";
import type { PageId } from "../../../store/pagesStore";
import type { SaveStatus } from "../../../store/saveStatusStore";
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
  saveStatus: SaveStatus;
  assets: Asset[] | null;
  isUploadingAsset: boolean;
  onUploadAsset: (file: File) => void;
  onDeleteAsset: (assetId: string) => void;
  onInsertAsset: (asset: Asset) => void;
}

const SAVE_STATUS_LABEL: Record<SaveStatus, string | null> = {
  idle: null,
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save",
};

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
  saveStatus,
  assets,
  isUploadingAsset,
  onUploadAsset,
  onDeleteAsset,
  onInsertAsset,
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
        <div className={styles.projectRowTrailing}>
          {SAVE_STATUS_LABEL[saveStatus] && (
            <span className={styles.saveStatus} data-error={saveStatus === "error" || undefined}>
              {SAVE_STATUS_LABEL[saveStatus]}
            </span>
          )}
          <span className={styles.zoom}>{zoomPercent}%</span>
        </div>
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
        <ElementsPanel
          assets={assets}
          isUploading={isUploadingAsset}
          onUpload={onUploadAsset}
          onDelete={onDeleteAsset}
          onInsert={onInsertAsset}
        />
      )}
    </div>
  );
}
