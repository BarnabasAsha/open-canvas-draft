import { DEFAULT_REGISTERED_TOOLS } from "./tools/index";

// Feature-detected — a true no-op in every browser without WebMCP support
// today, so this is safe to call unconditionally. One AbortController
// covers every tool's registration; aborting it on teardown unregisters
// all of them in one call, same as this file's own registerTool options
// shape from the spec. Mirrors initPageAutosave/initPageEventLog's own
// init-returns-teardown shape exactly (see CanvasEditorPage.tsx).
export function initWebMcpTools(): () => void {
  if (!document.modelContext) {
    console.warn(
      "[webmcp] document.modelContext is not present — this browser doesn't expose WebMCP (or the flag enabling it isn't on). No tools were registered.",
    );
    return () => {};
  }

  const controller = new AbortController();
  for (const tool of DEFAULT_REGISTERED_TOOLS) {
    document.modelContext.registerTool(tool, { signal: controller.signal });
  }
  console.info(
    `[webmcp] registered ${DEFAULT_REGISTERED_TOOLS.length} tools:`,
    DEFAULT_REGISTERED_TOOLS.map((tool) => tool.name),
  );
  return () => controller.abort();
}
