import { Menu } from "@base-ui/react/menu";
import { CopyIcon, DotsThreeVerticalIcon, FolderOpenIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import styles from "./ProjectList.module.css";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListProps {
  projects: Project[];
  hasUnfilteredProjects: boolean;
  onOpen: (project: Project) => void;
  onRename: (project: Project, name: string) => void;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// There's no real thumbnail/preview concept for a project yet — this
// stands in with a deterministic two-tone gradient derived from the
// project's own id, so the grid isn't visually flat, without pretending
// there's a real preview-rendering pipeline behind it.
function thumbnailFor(id: string): string {
  const hash = hashString(id);
  const hue = hash % 360;
  const angle = 120 + (hash % 60);
  return `linear-gradient(${angle}deg, oklch(90% 0.03 ${hue}) 58%, oklch(78% 0.05 ${hue}) 58%)`;
}

export function ProjectList({ projects, hasUnfilteredProjects, onOpen, onRename, onDuplicate, onDelete }: ProjectListProps) {
  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={onOpen}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
      {projects.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyBadge}>
            {hasUnfilteredProjects ? <MagnifyingGlassIcon size={22} /> : <FolderOpenIcon size={22} />}
          </div>
          <div className={styles.emptyTitle}>{hasUnfilteredProjects ? "No matches" : "No projects yet"}</div>
          <div className={styles.emptyHint}>
            {hasUnfilteredProjects ? "Try a different search term." : "Create your first project to get started."}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onRename: (project: Project, name: string) => void;
  onDuplicate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

// Mirrors PagesPanel.tsx's PageRow rename interaction (same edit-mode state
// shape, same commit/cancel keys) — the options menu itself follows
// AvatarButton.tsx's established Menu.Root/Trigger/Popup pattern.
function ProjectCard({ project, onOpen, onRename, onDuplicate, onDelete }: ProjectCardProps) {
  const [editingName, setEditingName] = useState<string | null>(null);

  function commitRename(): void {
    const trimmed = editingName?.trim();
    if (trimmed && trimmed !== project.name) onRename(project, trimmed);
    setEditingName(null);
  }

  // A plain div, not a <button> -- the kebab menu below needs its own real
  // button, and a button can't legally contain another one. role="button"
  // + the keydown handler restore the same keyboard operability a <button>
  // would have given for free (focus + Enter/Space to open).
  return (
    <div
      className={styles.tile}
      role="button"
      tabIndex={0}
      onClick={() => editingName === null && onOpen(project)}
      onKeyDown={(e) => {
        if (editingName !== null) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
    >
      <div className={styles.tileThumb} style={{ background: thumbnailFor(project.id) }} />
      <div className={styles.tileFooter}>
        <div className={styles.tileInfo}>
          {editingName !== null ? (
            <input
              className={`layer-row-name-input ${styles.tileNameInput}`}
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
            <span className={styles.tileName}>{project.name}</span>
          )}
          {project.description && <span className={styles.tileDescription}>{project.description}</span>}
          <span className={styles.tileMeta}>Edited {formatUpdatedAt(project.updatedAt)}</span>
        </div>
        <Menu.Root>
          <Menu.Trigger
            className={`icon-button ${styles.tileKebab}`}
            aria-label="Project options"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsThreeVerticalIcon size={15} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={4} className="menu-positioner">
              {/* React's portal event bubbling follows the JSX tree, not the
                  DOM tree -- without this, an item click here would still
                  reach the outer tile's onClick and navigate away, since
                  Menu.Portal keeps this a React child of that tile. */}
              <Menu.Popup className="menu-popup" onClick={(e) => e.stopPropagation()}>
                <Menu.Item className="menu-item" onClick={() => setEditingName(project.name)}>
                  <PencilSimpleIcon size={15} color="var(--text-muted)" />
                  Rename
                </Menu.Item>
                <Menu.Item className="menu-item" onClick={() => onDuplicate(project)}>
                  <CopyIcon size={15} color="var(--text-muted)" />
                  Duplicate
                </Menu.Item>
                <Menu.Separator className="menu-separator" />
                <Menu.Item
                  className="menu-item"
                  onClick={() => {
                    if (window.confirm(`Delete "${project.name}"? This can't be undone.`)) onDelete(project);
                  }}
                >
                  <TrashIcon size={15} color="var(--danger)" />
                  Delete
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </div>
  );
}
