import { useState, type FormEvent } from "react";
import { Button } from "../primitives/Button/Button";
import { Modal } from "../primitives/Modal/Modal";
import styles from "./CreateProjectModal.module.css";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isSubmitting: boolean;
}

// Description is collected here but never sent anywhere — there's no
// backend field for it yet. Only `name` reaches onSubmit, matching what
// POST /api/projects actually accepts today.
export function CreateProjectModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New project"
      description="Give your project a name to get started."
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || isSubmitting}>
            Create project
          </Button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="project-modal-name">
          Name
        </label>
        <input
          id="project-modal-name"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Description</span>
          <span className={styles.fieldHint}>Optional</span>
        </div>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project for?"
          rows={2}
        />
      </div>
    </Modal>
  );
}
