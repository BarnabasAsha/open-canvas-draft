import { generateNodeCss } from "@open-canvas/commands";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { SceneNode } from "@open-canvas/schema";
import { PanelSection } from "../fields";

interface CssSectionProps {
  node: SceneNode;
  parentNode: SceneNode | null;
}

// Read-only — no onFocus/onChange/onCommit, unlike every editable
// section. The one interaction is the Copy button's clipboard write, a
// self-contained browser API call triggered by an explicit click, not a
// store read or a fetch — the same spirit as every other section staying
// presentational.
export function CssSection({ node, parentNode }: CssSectionProps) {
  const [copied, setCopied] = useState(false);
  const css = generateNodeCss(node, parentNode);

  // CssSection isn't remounted when the selected node changes (same
  // component instance reused at the same tree position, same as every
  // other section) — without this, a "Copied" confirmation from the
  // previously-selected node would still be showing on whatever's
  // selected now, misrepresenting what's actually on the clipboard.
  useEffect(() => {
    setCopied(false);
  }, [node.id]);

  function handleCopy(): void {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <PanelSection title="CSS" defaultOpen={false}>
      <div className="css-inspector-block">
        <pre className="css-inspector-pre">{css}</pre>
        <button
          type="button"
          className="css-inspector-copy-btn"
          data-copied={copied || undefined}
          aria-label={copied ? "Copied" : "Copy CSS"}
          title={copied ? "Copied" : "Copy CSS"}
          onClick={handleCopy}
        >
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
        </button>
      </div>
    </PanelSection>
  );
}
