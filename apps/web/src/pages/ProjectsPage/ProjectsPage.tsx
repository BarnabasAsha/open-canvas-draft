import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { createProject, deleteProject, duplicateProject, listProjects, renameProject } from "../../lib/projects";
import { Button } from "../../ui/primitives/Button/Button";
import { useModal } from "../../ui/primitives/Modal/useModal";
import { CreateProjectModal } from "../../ui/CreateProjectModal/CreateProjectModal";
import { ProjectList, type Project } from "../../ui/ProjectList/ProjectList";
import styles from "./ProjectsPage.module.css";

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [query, setQuery] = useState("");
  const createModal = useModal();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  async function handleRename(project: Project, name: string): Promise<void> {
    const updated = await renameProject(project.id, name);
    setProjects((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? current);
  }

  async function handleDuplicate(project: Project): Promise<void> {
    const copy = await duplicateProject(project.id);
    setProjects((current) => (current ? [copy, ...current] : current));
  }

  async function handleDelete(project: Project): Promise<void> {
    await deleteProject(project.id);
    setProjects((current) => current?.filter((p) => p.id !== project.id) ?? current);
  }

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(trimmed));
  }, [projects, query]);

  async function handleCreate(name: string, description: string): Promise<void> {
    setIsCreating(true);
    try {
      const project = await createProject(name, description || undefined);
      navigate(`/design/${project.id}`);
    } finally {
      setIsCreating(false);
      createModal.close();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h1>Projects</h1>
          {projects && (
            <span className={styles.meta}>
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          <div className={styles.search}>
            <MagnifyingGlassIcon size={14} className={styles.searchIcon} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
            />
          </div>
          <Button icon={<PlusIcon size={14} weight="bold" />} onClick={createModal.open}>
            New project
          </Button>
        </div>
      </div>
      {projects && (
        <ProjectList
          projects={filteredProjects}
          hasUnfilteredProjects={projects.length > 0}
          onOpen={(project) => navigate(`/design/${project.id}`)}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}
      <CreateProjectModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />
    </div>
  );
}
