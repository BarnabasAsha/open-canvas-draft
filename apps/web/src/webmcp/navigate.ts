import type { NavigateFunction } from "react-router";

// useNavigate() is a hook — unusable from plain functions like the
// project-management tools (create_project/open_project), which run
// outside the component tree entirely, the same way sceneStore/
// historyManager already do. Standard React Router pattern for this: App.tsx
// hands its own navigate function in here once, callable imperatively
// from anywhere after that.
let navigateFn: NavigateFunction | null = null;

export function setNavigate(fn: NavigateFunction): void {
  navigateFn = fn;
}

export function navigateTo(path: string): void {
  navigateFn?.(path);
}
