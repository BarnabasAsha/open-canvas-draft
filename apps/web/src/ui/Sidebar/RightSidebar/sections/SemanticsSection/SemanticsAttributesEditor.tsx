import { TrashIcon } from "@phosphor-icons/react";
import type { Semantics } from "@open-canvas/schema";
import { TextField } from "../../fields";
import styles from "./SemanticsSection.module.css";

interface SemanticsAttributesEditorProps {
  properties: Semantics["properties"];
  onFocus: () => void;
  onChange: (properties: Record<string, string>) => void;
  onCommit: () => void;
}

// Rows are keyed by array index, not the object key — the key itself is
// what's being edited, so keying by it would remount the input mid-rename
// on every keystroke. Every change rebuilds the whole `properties` object
// from the current entries and sends it in full (never a partial patch):
// useNodeEdit's shallow merge only goes one level deep (semantics over
// semantics, not properties over properties), so a partial properties
// patch would silently drop sibling keys.
export function SemanticsAttributesEditor({ properties, onFocus, onChange, onCommit }: SemanticsAttributesEditorProps) {
  const entries = Object.entries(properties ?? {});

  function updateEntry(index: number, key: string, value: string): void {
    const next = Object.fromEntries(entries.map(([k, v], i) => (i === index ? [key, value] : [k, String(v)])));
    onChange(next);
  }

  function removeEntry(index: number): void {
    onFocus();
    const next = Object.fromEntries(entries.filter((_, i) => i !== index).map(([k, v]) => [k, String(v)]));
    onChange(next);
    onCommit();
  }

  function addEntry(): void {
    onFocus();
    const next = Object.fromEntries(entries.map(([k, v]) => [k, String(v)]));
    next[""] = "";
    onChange(next);
    onCommit();
  }

  return (
    <div className={styles.attributes}>
      {entries.map(([key, value], index) => (
        <div key={index} className={styles.attributeRow}>
          <TextField
            label="Key"
            value={key}
            onFocus={onFocus}
            onChange={(next) => updateEntry(index, next, String(value))}
            onCommit={onCommit}
          />
          <TextField
            label="Value"
            value={String(value)}
            onFocus={onFocus}
            onChange={(next) => updateEntry(index, key, next)}
            onCommit={onCommit}
          />
          <button
            type="button"
            className={`icon-button ${styles.removeButton}`}
            onClick={() => removeEntry(index)}
            aria-label={`Remove attribute ${key || index}`}
          >
            <TrashIcon size={12} />
          </button>
        </div>
      ))}
      <button type="button" className={styles.addButton} onClick={addEntry}>
        + Add attribute
      </button>
    </div>
  );
}
