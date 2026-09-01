import type { SceneNode } from "@open-canvas/schema";
import { resolveSemanticTag } from "@open-canvas/schema";
import { PanelSection } from "../fields";

interface SemanticsSectionProps {
  node: SceneNode;
}

// Read-only for now — the HTML exporter is the first real consumer of a
// set tag/role/properties, but there's still no UI to author an override
// here yet. Always shown, not gated on `node.semantics` being set, so the
// resolved tag — explicit if authored, otherwise the node type's own
// default (DEFAULT_SEMANTIC_TAG in @open-canvas/schema) — is visible and
// discoverable even before anyone has ever touched this section.
export function SemanticsSection({ node }: SemanticsSectionProps) {
  const tag = resolveSemanticTag(node);
  const isExplicit = node.semantics !== null;

  return (
    <PanelSection title="Semantics">
      <div className="field-box">
        <span className="field-box-label">Tag</span>
        <span className="semantics-value">
          {`<${tag}>`}
          {!isExplicit && " (default)"}
        </span>
      </div>
      {node.semantics?.role && (
        <div className="field-box">
          <span className="field-box-label">Role</span>
          <span className="semantics-value">{node.semantics.role}</span>
        </div>
      )}
    </PanelSection>
  );
}
