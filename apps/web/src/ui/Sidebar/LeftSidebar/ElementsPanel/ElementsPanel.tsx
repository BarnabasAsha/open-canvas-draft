import { useState } from "react";
import styles from "./ElementsPanel.module.css";

type LibraryTab = "icons" | "photos" | "blocks";

const TABS: { value: LibraryTab; label: string }[] = [
  { value: "icons", label: "Icons" },
  { value: "photos", label: "Photos" },
  { value: "blocks", label: "Blocks" },
];

// A real icon/photo/block library (search, licensing, drag-to-canvas
// insertion) is its own future subsystem — none of it exists yet, so
// every tab is an honest "coming soon" rather than static demo content
// dressed up as something real.
export function ElementsPanel() {
  const [tab, setTab] = useState<LibraryTab>("icons");

  return (
    <div className={styles.root}>
      <div className={styles.subTabs}>
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={styles.subTab}
            data-active={tab === value || undefined}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.comingSoon}>Coming soon</div>
    </div>
  );
}
