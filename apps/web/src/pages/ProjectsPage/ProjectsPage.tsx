import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { fetchJson } from "../../lib/api";
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
    fetchJson<Project[]>("/api/projects").then(setProjects);
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(trimmed));
  }, [projects, query]);

  async function handleCreate(name: string, description: string): Promise<void> {
    setIsCreating(true);
    try {
      const project = await fetchJson<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(description ? { name, description } : { name }),
      });
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
