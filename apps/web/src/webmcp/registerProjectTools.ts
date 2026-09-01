import { PROJECT_MANAGEMENT_TOOLS } from "./tools/projectManagementTools";

// Same shape as registerTools.ts's initWebMcpTools, deliberately kept
// separate — this one is called once from App.tsx (alive for the whole
// authenticated session), not per-project from CanvasEditorPage.
export function initProjectManagementTools(): () => void {
  if (!document.modelContext) {
    console.warn(
      "[webmcp] document.modelContext is not present — this browser doesn't expose WebMCP (or the flag enabling it isn't on). No tools were registered.",
    );
    return () => {};
  }

  const controller = new AbortController();
  for (const tool of PROJECT_MANAGEMENT_TOOLS) {
    document.modelContext.registerTool(tool, { signal: controller.signal });
  }
  console.info(
    `[webmcp] registered ${PROJECT_MANAGEMENT_TOOLS.length} project-management tools:`,
    PROJECT_MANAGEMENT_TOOLS.map((tool) => tool.name),
  );
  return () => controller.abort();
}
