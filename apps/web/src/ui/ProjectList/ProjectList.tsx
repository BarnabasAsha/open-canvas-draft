import { DotsThreeVerticalIcon, FolderOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import styles from "./ProjectList.module.css";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListProps {
  projects: Project[];
  hasUnfilteredProjects: boolean;
  onOpen: (project: Project) => void;
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

export function ProjectList({ projects, hasUnfilteredProjects, onOpen }: ProjectListProps) {
  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <button key={project.id} type="button" className={styles.tile} onClick={() => onOpen(project)}>
          <div className={styles.tileThumb} style={{ background: thumbnailFor(project.id) }} />
          <div className={styles.tileFooter}>
            <div className={styles.tileInfo}>
              <span className={styles.tileName}>{project.name}</span>
              <span className={styles.tileMeta}>Edited {formatUpdatedAt(project.updatedAt)}</span>
            </div>
            <DotsThreeVerticalIcon size={15} className={styles.tileKebab} />
          </div>
        </button>
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
