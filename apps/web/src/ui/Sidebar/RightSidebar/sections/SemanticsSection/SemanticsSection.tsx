import type { SceneNode, Semantics } from "@open-canvas/schema";
import { resolveSemanticTag } from "@open-canvas/schema";
import { PanelSection, TextField } from "../../fields";
import { SemanticsAttributesEditor } from "./SemanticsAttributesEditor";
import styles from "./SemanticsSection.module.css";

interface SemanticsSectionProps {
  node: SceneNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Every edit path builds on this, not node.semantics directly — `tag` is
// required by SemanticsSchema, so the first edit made through role or
// attributes (while no override exists yet) still has to produce a
// schema-valid object, defaulting tag to whatever's already resolved
// rather than forcing the user to touch the tag field first.
function currentSemantics(node: SceneNode): Semantics {
  return node.semantics ?? { tag: resolveSemanticTag(node) };
}

function withoutRole(semantics: Semantics): Semantics {
  const next = { ...semantics };
  delete next.role;
  return next;
}

export function SemanticsSection({ node, onFocus, onChange, onCommit }: SemanticsSectionProps) {
  const isExplicit = node.semantics !== null;

  function handleTagChange(value: string): void {
    onChange({ semantics: { ...currentSemantics(node), tag: value } });
  }

  // Clearing the field is a second way to reach the same outcome as the
  // reset button below — resolveSemanticTag returns the live (possibly
  // just-typed-empty) tag verbatim here, since `??` only falls back on
  // null/undefined, never on "".
  function handleTagCommit(): void {
    if (resolveSemanticTag(node).trim() === "") {
      onChange({ semantics: null });
    }
    onCommit();
  }

  function handleRoleChange(value: string): void {
    onChange({ semantics: { ...currentSemantics(node), role: value } });
  }

  function handleRoleCommit(): void {
    const semantics = currentSemantics(node);
    if (!semantics.role || semantics.role.trim() === "") {
      onChange({ semantics: withoutRole(semantics) });
    }
    onCommit();
  }

  function handleAttributesChange(properties: Record<string, string>): void {
    onChange({ semantics: { ...currentSemantics(node), properties } });
  }

  function resetToDefault(): void {
    onFocus();
    onChange({ semantics: null });
    onCommit();
  }

  return (
    <PanelSection title="Semantics">
      <div className={styles.tagRow}>
        <TextField label="Tag" value={resolveSemanticTag(node)} onFocus={onFocus} onChange={handleTagChange} onCommit={handleTagCommit} />
        {isExplicit && (
          <button type="button" className={styles.resetButton} onClick={resetToDefault}>
            Reset
          </button>
        )}
      </div>
      <TextField
        label="Role"
        value={node.semantics?.role ?? ""}
        onFocus={onFocus}
        onChange={handleRoleChange}
        onCommit={handleRoleCommit}
      />
      <SemanticsAttributesEditor
        properties={node.semantics?.properties}
        onFocus={onFocus}
        onChange={handleAttributesChange}
        onCommit={onCommit}
      />
    </PanelSection>
  );
}
