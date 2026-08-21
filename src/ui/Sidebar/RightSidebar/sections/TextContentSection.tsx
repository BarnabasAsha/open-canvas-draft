import type { TextNode } from "../../../../types/scene";
import { PanelSection, TextAreaField } from "../fields";

interface TextContentSectionProps {
  node: TextNode;
  onFocus: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onCommit: () => void;
}

export function TextContentSection({ node, onFocus, onChange, onCommit }: TextContentSectionProps) {
  return (
    <PanelSection title="Content">
      <TextAreaField label="Text" value={node.content} onFocus={onFocus} onCommit={onCommit} onChange={(value) => onChange({ content: value })} />
    </PanelSection>
  );
}
