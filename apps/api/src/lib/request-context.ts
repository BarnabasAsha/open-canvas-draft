import { DomainError } from "../core";
import type { Session } from "./auth";

// "Request data belongs at the HTTP boundary" (InferDI's own design
// principle) — this is the one small app-level type that carries
// identity into the DI graph, instead of threading Hono's Context into
// commands/domain code. Everything downstream of the HTTP boundary
// depends on THIS, never on Hono directly.
export interface RequestContext {
  requestId: string;
  userId: string | null;
  session: Session | null;
}

// Every Command/Query that requires auth calls this first — requireAuth
// middleware already guarantees userId is set before a route handler can
// reach a Command, but a Command shouldn't implicitly trust that every
// future route remembered to apply it; this is the cheap defensive check
// every one of them shares instead of repeating an inline null check.
export function requireUserId(ctx: RequestContext): string {
  if (!ctx.userId) throw new DomainError("Authentication required");
  return ctx.userId;
}
