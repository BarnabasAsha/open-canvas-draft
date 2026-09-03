import { DEFAULT_REGISTERED_TOOLS } from "./tools/index";

// registerTool is async (see types.ts), but this function can't be — React
// calls initWebMcpTools() from a useEffect and needs the teardown function
// back synchronously, not a Promise. The actual registration runs as a
// fire-and-forget task (void, started but not awaited here) instead.
async function registerAll(modelContext: NonNullable<Document["modelContext"]>, controller: AbortController): Promise<void> {
  // The whole body is wrapped, not just the individual registerTool calls
  // (which Promise.allSettled already isolates) — a browser whose
  // registerTool doesn't conform to the spec (e.g. throws synchronously
  // instead of returning a rejected Promise) would throw during the
  // .map() below, before Promise.allSettled ever sees it, turning into an
  // unhandled rejection on this fire-and-forget task with no [webmcp] log
  // at all. Catching here guarantees a diagnosable log line regardless of
  // what actually goes wrong.
  try {
    const outcomes = await Promise.allSettled(
      DEFAULT_REGISTERED_TOOLS.map((tool) => modelContext.registerTool(tool, { signal: controller.signal })),
    );

    const failures: { name: string; reason: unknown }[] = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.status === "rejected") failures.push({ name: DEFAULT_REGISTERED_TOOLS[index].name, reason: outcome.reason });
    });

    if (failures.length > 0) {
      // A partial registration is worse than none — an agent that sees some
      // but not all tools has no reliable way to know which are missing.
      // Aborting the shared controller unregisters whatever DID succeed,
      // same mechanism teardown already relies on.
      controller.abort();
      for (const { name, reason } of failures) {
        console.error(`[webmcp] failed to register tool "${name}":`, reason);
      }
      return;
    }

    console.info(
      `[webmcp] registered ${DEFAULT_REGISTERED_TOOLS.length} tools:`,
      DEFAULT_REGISTERED_TOOLS.map((tool) => tool.name),
    );
  } catch (err) {
    controller.abort();
    console.error("[webmcp] tool registration failed unexpectedly:", err);
  }
}

// Feature-detected — a true no-op in every browser without WebMCP support
// today, so this is safe to call unconditionally. One AbortController
// covers every tool's registration; aborting it on teardown unregisters
// all of them in one call, same as this file's own registerTool options
// shape from the spec. Mirrors initPageAutosave/initPageEventLog's own
// init-returns-teardown shape exactly (see CanvasEditorPage.tsx).
export function initWebMcpTools(): () => void {
  const modelContext = document.modelContext;
  if (!modelContext) {
    console.warn(
      "[webmcp] document.modelContext is not present — this browser doesn't expose WebMCP (or the flag enabling it isn't on). No tools were registered.",
    );
    return () => {};
  }

  const controller = new AbortController();
  void registerAll(modelContext, controller);
  return () => controller.abort();
}
