import type { SceneNode, Semantics } from "@open-canvas/schema";
import { resolveSemanticTag } from "@open-canvas/schema";
import { PanelSection, SelectField, TextField } from "../../fields";
import { SemanticsAttributesEditor } from "./SemanticsAttributesEditor";
import styles from "./SemanticsSection.module.css";

interface SemanticsSectionProps {
  node: SceneNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

// Closed list, not free text (v1 decision) — this app's export goal is
// accessible, semantically meaningful HTML for a visual design tool, not
// arbitrary custom elements/web components, which is a code-tool workflow
// this product doesn't target. Covers what a design tool's export
// realistically needs: headings, sectioning/landmarks, basic text
// semantics, and the interactive/media/list/form tags that already have a
// canvas counterpart (UiPrimitiveKind's button/input/label/link, image,
// etc.) — not the full ~150-element HTML5 set.
const TAG_OPTIONS = [
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "nav",
  "main",
  "section",
  "article",
  "aside",
  "footer",
  "strong",
  "em",
  "button",
  "a",
  "img",
  "video",
  "ul",
  "ol",
  "li",
  "form",
  "input",
  "label",
].map((tag) => ({ value: tag, label: tag }));

// A tag set via WebMCP's update_element (unconstrained there — an agent
// isn't limited to this curated list) can fall outside it. SelectField's
// own trigger already falls back to displaying the raw value verbatim
// when it isn't among `options`, so this stays correctly visible instead
// of silently disappearing — just also listed as a real, selectable
// option so re-selecting the same value (e.g. after picking something
// else and coming back) works the same as any other entry.
function tagOptionsFor(currentTag: string): typeof TAG_OPTIONS {
  return TAG_OPTIONS.some((option) => option.value === currentTag)
    ? TAG_OPTIONS
    : [...TAG_OPTIONS, { value: currentTag, label: currentTag }];
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

  // Discrete choice, not live-preview-then-commit — same as every other
  // SelectField call site (e.g. LayoutSection's direction/align pickers).
  function handleTagSelect(value: string): void {
    onFocus();
    onChange({ semantics: { ...currentSemantics(node), tag: value } });
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
        <SelectField label="Tag" value={resolveSemanticTag(node)} options={tagOptionsFor(resolveSemanticTag(node))} onChange={handleTagSelect} />
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
