import { useState } from "react";
import { ArrowUpIcon, SparkleIcon } from "@phosphor-icons/react";
import styles from "./AiComposerPill.module.css";

interface AiComposerPillProps {
  onSubmit: (prompt: string) => void;
}

// Resting state of the AI composer (variant "1a" in the redesign) — a
// single pill anchored to the bottom-center of the canvas, never covering
// a panel. Standalone and NOT mounted anywhere yet (AI is a future phase,
// see CLAUDE.md) — pixel-perfect and ready to wire up when that phase
// arrives, so this doesn't have to be re-derived from the design file.
export function AiComposerPill({ onSubmit }: AiComposerPillProps) {
  const [value, setValue] = useState("");

  function handleSubmit(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <div className={styles.pill}>
      <SparkleIcon size={16} weight="light" className={styles.icon} />
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe a change, or a page to generate…"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      <span className={styles.shortcut}>⌘K</span>
      <button type="button" className={styles.send} aria-label="Send" onClick={handleSubmit}>
        <ArrowUpIcon size={15} weight="bold" />
      </button>
    </div>
  );
}
