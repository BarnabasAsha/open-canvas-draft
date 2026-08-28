import { Menu } from "@base-ui/react/menu";
import { CaretDownIcon, DesktopIcon, DoorOpenIcon, FolderIcon, MoonIcon, SunIcon, type Icon } from "@phosphor-icons/react";
import type { ThemePreference } from "../../store/themeStore";
import styles from "./AvatarButton.module.css";

interface AvatarButtonProps {
  name: string;
  email: string;
  image: string | null | undefined;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onProjects: () => void;
  onLogout: () => void;
  // The canvas rail uses a smaller trigger (26px) than the dashboard
  // topbar (30px) — same component, design calls for two scales.
  compact?: boolean;
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const APPEARANCE_OPTIONS: { value: ThemePreference; icon: Icon; label: string }[] = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: DesktopIcon, label: "System" },
];

// The way back out of a project, not a permanent nav item — there's
// nothing else to navigate to yet (no sidebar), so this is purely
// "return to the projects list," "log out," and the appearance switcher.
export function AvatarButton({
  name,
  email,
  image,
  theme,
  onThemeChange,
  onProjects,
  onLogout,
  compact = false,
}: AvatarButtonProps) {
  const initials = initialsFor(name);
  const buttonClassName = compact ? `${styles.button} ${styles.buttonCompact}` : styles.button;

  return (
    <Menu.Root>
      <Menu.Trigger className={styles.trigger} aria-label="Account menu" title={name}>
        <span className={buttonClassName}>{image ? <img src={image} alt="" /> : initials}</span>
        <CaretDownIcon size={12} className={styles.caret} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6} className="menu-positioner">
          <Menu.Popup className={`menu-popup ${styles.menuPopup}`}>
            <div className={styles.menuHeader}>
              <div className={styles.menuHeaderAvatar} aria-hidden="true">
                {image ? <img src={image} alt="" /> : initials}
              </div>
              <div className={styles.menuHeaderText}>
                <div className={styles.menuName}>{name}</div>
                <div className={styles.menuEmail}>{email}</div>
              </div>
            </div>
            <Menu.Separator className="menu-separator" />
            <Menu.Item className="menu-item" onClick={onProjects}>
              <FolderIcon size={15} color="var(--text-muted)" />
              Projects
            </Menu.Item>
            <Menu.Separator className="menu-separator" />
            <Menu.Item className="menu-item" onClick={onLogout}>
              <DoorOpenIcon size={15} color="var(--text-muted)" />
              Logout
            </Menu.Item>
            <Menu.Separator className="menu-separator" />
            <div className={styles.menuAppearance}>
              <span className={styles.menuAppearanceLabel}>Appearance</span>
              <div className={styles.appearanceSwitch}>
                {APPEARANCE_OPTIONS.map(({ value, icon: OptionIcon, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.appearanceSwitchOption}
                    data-active={theme === value || undefined}
                    aria-label={label}
                    title={label}
                    onClick={() => onThemeChange(value)}
                  >
                    <OptionIcon size={13} />
                  </button>
                ))}
              </div>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
