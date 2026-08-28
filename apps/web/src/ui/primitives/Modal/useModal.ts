import { useCallback, useState } from "react";

export interface ModalControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// So a page reaching for a modal doesn't have to hand-roll its own
// isOpen/open/close useState trio every time — every modal in the app
// (create-project today, more later) manages its open state through this
// one hook instead.
export function useModal(initialOpen = false): ModalControls {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  return { isOpen, open, close, toggle };
}
