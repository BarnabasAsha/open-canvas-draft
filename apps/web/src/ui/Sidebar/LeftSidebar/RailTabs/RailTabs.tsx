import { Tabs } from "@base-ui/react/tabs";
import { SquaresFourIcon, StackIcon } from "@phosphor-icons/react";
import styles from "./RailTabs.module.css";

export type RailTab = "layers" | "elements";

interface RailTabsProps {
  value: RailTab;
  onChange: (tab: RailTab) => void;
}

export function RailTabs({ value, onChange }: RailTabsProps) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onChange(next as RailTab)} className={styles.root}>
      <Tabs.List className={styles.list}>
        <Tabs.Tab value="layers" className={styles.tab}>
          <StackIcon size={12} />
          Layers
        </Tabs.Tab>
        <Tabs.Tab value="elements" className={styles.tab}>
          <SquaresFourIcon size={12} />
          Elements
        </Tabs.Tab>
      </Tabs.List>
    </Tabs.Root>
  );
}
