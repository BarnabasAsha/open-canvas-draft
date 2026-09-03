// Every tool returns this instead of throwing for an expected failure (a
// command factory declining because the input doesn't make sense — e.g.
// grouping fewer than two nodes) — gives an agent something to react to
// instead of an opaque exception, matching the same "concise structured
// result, including warnings" shape a human's own undo/redo history reads.
export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function ok<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function fail<T>(error: string): ToolResult<T> {
  return { ok: false, error };
}

// A WebMCP tool as this app builds it — deliberately simpler than the real
// `document.modelContext.registerTool` shape (see registerTools.ts, the one
// place that adapts to it): no cancellation signal threaded through every
// tool file, since every operation here is a synchronous store mutation
// with nothing worth cancelling mid-flight.
export interface WebMcpTool<TInput = Record<string, never>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: TInput) => Promise<ToolResult<TOutput>>;
}

// Minimal ambient typing for the real (still-experimental) browser API —
// only the surface this app actually calls. Not a full model of the spec;
// widen this if a later tool needs getTools()/executeTool()/ontoolchange.
declare global {
  interface Document {
    // `tool` is typed as `object`, not `WebMcpTool<...>` — a heterogeneous
    // array of tools each with their own TInput/TOutput (see tools/index.ts)
    // is what actually gets registered, and TInput is contravariant in
    // WebMcpTool's own `execute`, so no single concrete WebMcpTool<X, Y>
    // type could accept all of them at this call site anyway.
    modelContext?: {
      // Registration is asynchronous per the WebMCP spec — the browser may
      // need real work (e.g. surfacing the tool to whatever agent/extension
      // is listening) before it's confirmed. See registerTools.ts/
      // registerProjectTools.ts for how callers await this without making
      // their own init functions async.
      registerTool: (tool: object, options?: { signal?: AbortSignal }) => Promise<void>;
    };
  }
}
