import { useRef, useState, type ChangeEvent } from "react";
import { TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type { Asset } from "../../../../lib/assets";
import type { IconManifestEntry } from "../../../../lib/iconManifest";
import { IconsTab } from "./IconsTab";
import styles from "./ElementsPanel.module.css";

type LibraryTab = "icons" | "photos" | "blocks";

const TABS: { value: LibraryTab; label: string }[] = [
  { value: "icons", label: "Icons" },
  { value: "photos", label: "Photos" },
  { value: "blocks", label: "Blocks" },
];

interface ElementsPanelProps {
  assets: Asset[] | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (assetId: string) => void;
  onInsert: (asset: Asset) => void;
  icons: IconManifestEntry[] | null;
  onRequestIcons: () => void;
  onInsertIcon: (icon: IconManifestEntry) => void;
}

// Blocks is its own future subsystem (search, licensing, drag-to-canvas
// insertion) — none of that exists yet, so it stays an honest "coming soon"
// rather than static demo content dressed up as something real. Photos and
// Icons are both backed by real data (uploaded project assets, and the
// bundled Phosphor icon manifest respectively), not a library to build
// later.
export function ElementsPanel({
  assets,
  isUploading,
  onUpload,
  onDelete,
  onInsert,
  icons,
  onRequestIcons,
  onInsertIcon,
}: ElementsPanelProps) {
  const [tab, setTab] = useState<LibraryTab>("icons");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onUpload(file);
  }

  function handleTabClick(value: LibraryTab): void {
    setTab(value);
    if (value === "icons") onRequestIcons();
  }

  return (
    <div className={styles.root}>
      <div className={styles.subTabs}>
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={styles.subTab}
            data-active={tab === value || undefined}
            onClick={() => handleTabClick(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "icons" ? (
        <IconsTab icons={icons} onInsert={onInsertIcon} />
      ) : tab === "photos" ? (
        <div className={styles.photos}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadSimpleIcon size={14} />
            {isUploading ? "Uploading…" : "Upload photo"}
          </button>
          {assets === null ? (
            <div className={styles.comingSoon}>Loading…</div>
          ) : assets.length === 0 ? (
            <div className={styles.comingSoon}>No photos yet</div>
          ) : (
            <div className={styles.grid}>
              {assets.map((asset) => (
                <div key={asset.id} className={styles.thumb}>
                  <img src={asset.url} alt={asset.fileName} onClick={() => onInsert(asset)} />
                  <button
                    type="button"
                    className={`icon-button ${styles.deleteButton}`}
                    onClick={() => onDelete(asset.id)}
                    aria-label={`Delete ${asset.fileName}`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.comingSoon}>Coming soon</div>
      )}
    </div>
  );
}
