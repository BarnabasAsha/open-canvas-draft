import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { PageId } from "../../../store/pagesStore";

interface PageSummary {
  id: PageId;
  name: string;
}

interface PagesPanelProps {
  pages: PageSummary[];
  activePageId: PageId;
  onSwitch: (id: PageId) => void;
  onAdd: () => void;
  onRename: (id: PageId, name: string) => void;
  onDelete: (id: PageId) => void;
}

export function PagesPanel({ pages, activePageId, onSwitch, onAdd, onRename, onDelete }: PagesPanelProps) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="collapsible-trigger" style={{ cursor: "default" }}>
        <span style={{ flex: 1 }}>Pages</span>
        <button type="button" className="icon-button" aria-label="Add page" title="Add page" onClick={onAdd}>
          <PlusIcon size={15} />
        </button>
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {pages.map((page) => (
          <PageRow
            key={page.id}
            page={page}
            isActive={page.id === activePageId}
            canDelete={pages.length > 1}
            onSwitch={onSwitch}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface PageRowProps {
  page: PageSummary;
  isActive: boolean;
  canDelete: boolean;
  onSwitch: (id: PageId) => void;
  onRename: (id: PageId, name: string) => void;
  onDelete: (id: PageId) => void;
}

// Mirrors LayerItem.tsx's rename interaction exactly (same edit-mode state
// shape, same commit/cancel keys, same CSS classes) — pages and layers are
// different things, but "double-click a name to rename it inline" should
// feel identical everywhere it shows up in this app.
function PageRow({ page, isActive, canDelete, onSwitch, onRename, onDelete }: PageRowProps) {
  const [editingName, setEditingName] = useState<string | null>(null);

  function commitRename(): void {
    const trimmed = editingName?.trim();
    if (trimmed) onRename(page.id, trimmed);
    setEditingName(null);
  }

  return (
    <div
      className="layer-row"
      onClick={() => onSwitch(page.id)}
      data-selected={isActive || undefined}
      style={{ paddingLeft: 12 }}
    >
      {editingName !== null ? (
        <input
          className="layer-row-name-input"
          value={editingName}
          autoFocus
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            else if (e.key === "Escape") setEditingName(null);
          }}
        />
      ) : (
        <span
          className="layer-row-name"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingName(page.name);
          }}
        >
          {page.name}
        </span>
      )}
      {canDelete && (
        <span className="layer-row-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Delete page"
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${page.name}"? This can't be undone.`)) onDelete(page.id);
            }}
          >
            <TrashIcon size={16} />
          </button>
        </span>
      )}
    </div>
  );
}
