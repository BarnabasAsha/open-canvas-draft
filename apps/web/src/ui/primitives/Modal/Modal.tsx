import type { FormEvent, ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import styles from "./Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  // When provided, body+footer render inside a <form> instead of plain
  // divs — CreateProjectModal (Enter-to-submit on the Name field, a real
  // type="submit" button) needs this; a content-only modal doesn't.
  onSubmit?: (e: FormEvent) => void;
}

// The one modal shell every dialog in the app should render through —
// overlay, centered card, header (title+description+close), body,
// optional footer. Pair with useModal for open-state management. Before
// this, CreateProjectModal hand-built this whole shell itself with no
// way to reuse it for the next modal.
export function Modal({ isOpen, onClose, title, description, children, footer, onSubmit }: ModalProps) {
  function handleOpenChange(open: boolean): void {
    if (!open) onClose();
  }

  const content = (
    <>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <div className={styles.header}>
            <div className={styles.headerText}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {description && <Dialog.Description className={styles.subtitle}>{description}</Dialog.Description>}
            </div>
            <Dialog.Close className={styles.close} aria-label="Close">
              <XIcon size={13} weight="bold" />
            </Dialog.Close>
          </div>
          {onSubmit ? <form onSubmit={onSubmit}>{content}</form> : content}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
