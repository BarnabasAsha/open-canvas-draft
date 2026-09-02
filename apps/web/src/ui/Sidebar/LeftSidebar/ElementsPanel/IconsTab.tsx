import { useMemo, useState } from "react";
import type { IconManifestEntry } from "../../../../lib/iconManifest";
import styles from "./IconsTab.module.css";

// Purely presentational — icons arrive already loaded (or null, while
// loading) as a prop; this only owns the search text, matching the
// container/presentational split every other panel in this app follows.
interface IconsTabProps {
  icons: IconManifestEntry[] | null;
  onInsert: (icon: IconManifestEntry) => void;
}

// Filtering 1512 icons against a name/tag match is instant even with no
// debounce (same "plain controlled input + useMemo" pattern as
// ProjectsPage.tsx's project search) — capping how many actually render
// keeps the DOM small regardless of how broad the query is.
const MAX_RESULTS = 60;

export function IconsTab({ icons, onInsert }: IconsTabProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!icons) return [];
    const q = query.trim().toLowerCase();
    const filtered = q === "" ? icons : icons.filter((icon) => icon.name.includes(q) || icon.tags.some((tag) => tag.includes(q)));
    return filtered.slice(0, MAX_RESULTS);
  }, [icons, query]);

  return (
    <div className={styles.root}>
      <input
        type="text"
        className={styles.search}
        placeholder="Search icons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {icons === null ? (
        <div className={styles.status}>Loading…</div>
      ) : matches.length === 0 ? (
        <div className={styles.status}>No icons found</div>
      ) : (
        <div className={styles.grid}>
          {matches.map((icon) => (
            <button
              key={icon.name}
              type="button"
              className={styles.thumb}
              onClick={() => onInsert(icon)}
              aria-label={icon.pascalName}
              title={icon.pascalName}
            >
              <svg viewBox={icon.viewBox} width={20} height={20} aria-hidden="true">
                <path d={icon.d} fill="currentColor" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
