import { createProjectTool } from "./createProject";
import { listProjectsTool } from "./listProjects";
import { openProjectTool } from "./openProject";

// Registered from App.tsx (see ../registerProjectTools.ts), not
// CanvasEditorPage.tsx — these operate on /api/projects and navigation,
// independent of any specific open project, and CanvasEditorPage/
// ProjectsPage are two separate top-level routes with no shared layout
// that's mounted for both, so App.tsx is the only place that's alive for
// the whole session regardless of which one is active.
export const PROJECT_MANAGEMENT_TOOLS = [createProjectTool, listProjectsTool, openProjectTool];
