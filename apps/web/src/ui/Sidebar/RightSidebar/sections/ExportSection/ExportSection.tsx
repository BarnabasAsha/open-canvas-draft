import { PanelSection } from "../../fields";
import { Button } from "../../../../primitives/Button/Button";

interface ExportSectionProps {
  onExport: () => void;
  isExporting: boolean;
}

// Only shown for a selected Frame (see PropertiesPanel.tsx) — deliberately
// its own section rather than folded into an existing one, so a future
// export format is just another button here, not a rework.
export function ExportSection({ onExport, isExporting }: ExportSectionProps) {
  return (
    <PanelSection title="Export" defaultOpen={false}>
      <Button variant="secondary" onClick={onExport} disabled={isExporting}>
        {isExporting ? "Exporting…" : "Export to HTML"}
      </Button>
    </PanelSection>
  );
}
