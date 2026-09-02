import { useState, type FormEvent } from "react";
import type { UnsplashPhoto } from "../../../../lib/unsplash";
import styles from "./UnsplashTab.module.css";

interface UnsplashTabProps {
  results: UnsplashPhoto[] | null;
  isSearching: boolean;
  onSearch: (query: string) => void;
  onInsert: (photo: UnsplashPhoto) => void;
}

// Static — doesn't depend on any per-photo or secret data, so it's safe to
// keep entirely client-side rather than round-tripping through the backend
// like the per-photo photographer links (which do need server-side UTM
// tagging — see unsplash-client.ts).
const UNSPLASH_HOME_URL = "https://unsplash.com/?utm_source=open_canvas&utm_medium=referral";

// Purely presentational, matching IconsTab's contract — but search here is
// a real network call against a real rate limit (Unsplash's Demo tier caps
// at 50/hour), so it's submit-triggered, not filtered live on every
// keystroke the way IconsTab's instant local search is.
export function UnsplashTab({ results, isSearching, onSearch, onInsert }: UnsplashTabProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <div className={styles.root}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.search}
          placeholder="Search Unsplash…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      {isSearching ? (
        <div className={styles.status}>Searching…</div>
      ) : results === null ? (
        <div className={styles.status}>Search free photos from Unsplash</div>
      ) : results.length === 0 ? (
        <div className={styles.status}>No photos found</div>
      ) : (
        <div className={styles.grid}>
          {results.map((photo) => (
            <div key={photo.id} className={styles.thumb}>
              <img src={photo.thumbUrl} alt={photo.description ?? "Unsplash photo"} onClick={() => onInsert(photo)} />
              <a
                className={styles.credit}
                href={photo.photographerProfileUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {photo.photographerName}
              </a>
            </div>
          ))}
        </div>
      )}
      <a className={styles.poweredBy} href={UNSPLASH_HOME_URL} target="_blank" rel="noreferrer">
        Photos from Unsplash
      </a>
    </div>
  );
}
