import type { ErrorHandler } from "hono";
import { DomainError, NotFoundError } from "../core";
import { getRequestLogger } from "../lib/logger";

// The one place a thrown error becomes an HTTP response. NotFoundError
// covers both "doesn't exist" and "exists but isn't yours" (see
// ProjectModel.assertOwnedBy) — there's deliberately no ForbiddenError/403
// in this codebase yet, since there's no case where "authenticated but
// categorically disallowed" differs from "not found" (no sharing/
// collaboration exists yet).
export const errorMiddleware: ErrorHandler = (err, c) => {
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  if (err instanceof DomainError) {
    return c.json({ error: err.message }, 422);
  }

  getRequestLogger().error({ err }, "Unhandled error");
  return c.json({ error: "Internal server error" }, 500);
};
