// Ambient "which project is open right now" — needed by non-React
// singleton modules that have no prop access to the route: imageTool.ts
// (scoping an asset upload) and pagesStore.ts (scoping add/rename/delete
// page calls to the backend). Read imperatively, never subscribed to, so
// a plain variable is enough (no need for the Store<T> subscribe pattern).
let currentProjectId: string | null = null;

export function setCurrentProjectId(projectId: string): void {
  currentProjectId = projectId;
}

export function getCurrentProjectId(): string | null {
  return currentProjectId;
}
