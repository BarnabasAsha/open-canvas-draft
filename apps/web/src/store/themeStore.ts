import { createStore, type Store } from "./createStore";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

// "system" means "no data-theme attribute at all" — the existing
// prefers-color-scheme media query in theme.css takes over from there.
function applyPreference(preference: ThemePreference): void {
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export const themeStore: Store<ThemePreference> = createStore(readStoredPreference());

applyPreference(themeStore.getState());

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
  applyPreference(preference);
  themeStore.update(() => preference);
}
