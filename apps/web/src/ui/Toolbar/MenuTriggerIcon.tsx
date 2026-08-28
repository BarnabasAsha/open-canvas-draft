import type { ReactNode } from "react";
import styles from "./Toolbar.module.css";

interface MenuTriggerIconProps {
  icon: ReactNode;
}

export function MenuTriggerIcon({ icon }: MenuTriggerIconProps) {
  return (
    <>
      {icon}
      <span className={styles.menuTriggerCaret} />
    </>
  );
}
