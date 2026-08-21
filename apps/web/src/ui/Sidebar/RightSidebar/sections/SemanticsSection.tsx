import type { Semantics } from "@open-canvas/schema";
import { PanelSection } from "../fields";

interface SemanticsSectionProps {
  semantics: Semantics;
}

// Read-only for now — nothing consumes an edited tag/role yet (there's no
// export layer), so this surfaces what a primitive already carries rather
// than pretending you can change what it exports as. Becomes editable once
// an export/interaction phase actually reads a user override.
export function SemanticsSection({ semantics }: SemanticsSectionProps) {
  return (
    <PanelSection title="Semantics">
      <div className="field-box">
        <span className="field-box-label">Tag</span>
        <span className="semantics-value">{`<${semantics.tag}>`}</span>
      </div>
      {semantics.role && (
        <div className="field-box">
          <span className="field-box-label">Role</span>
          <span className="semantics-value">{semantics.role}</span>
        </div>
      )}
    </PanelSection>
  );
}
