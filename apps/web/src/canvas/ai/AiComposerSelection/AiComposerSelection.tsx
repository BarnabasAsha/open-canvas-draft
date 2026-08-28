import { useState } from "react";
import { ArrowUpIcon, SparkleIcon } from "@phosphor-icons/react";
import styles from "./AiComposerSelection.module.css";

interface AiComposerSelectionProps {
  suggestions: string[];
  onSubmit: (prompt: string) => void;
}

// Selection-anchored composer (variant "1c") — appears directly under
// whatever's currently selected, with a row of quick-suggestion chips
// below it. Standalone and NOT mounted anywhere yet, same as
// AiComposerPill/AiComposerThread — see that file's comment for why.
export function AiComposerSelection({ suggestions, onSubmit }: AiComposerSelectionProps) {
  const [value, setValue] = useState("");

  function handleSubmit(prompt: string): void {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <SparkleIcon size={15} weight="light" className={styles.icon} />
        <input
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe a change…"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit(value);
          }}
        />
        <button type="button" className={styles.send} aria-label="Send" onClick={() => handleSubmit(value)}>
          <ArrowUpIcon size={13} weight="bold" />
        </button>
      </div>
      <div className={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" className={styles.chip} onClick={() => handleSubmit(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
