import { NotFoundError } from "../core";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed (non-UUID) path param would otherwise reach Drizzle/Postgres
// and throw a raw "invalid input syntax for type uuid" driver error — a
// 500, not the 404 this app's whole ownership model relies on for "doesn't
// exist or isn't yours" (see ProjectModel.assertOwnedBy). Called directly
// at each route handler's param read, not as Hono middleware: a
// `.use(pattern, mw)` registered on a sub-app mounted via `.route()` does
// not reliably fire once merged into the parent's tree — proven out by
// hand (a parent-level "/:projectId/*" check worked; the identical
// pattern registered on the child pageRoutes/assetRoutes app for its own
// local :pageId/:assetId param silently never ran) — so this is validated
// exactly where every existing handler already reads c.req.param(...)
// successfully, sidestepping the nested-mounting quirk entirely.
export function requireUuidParam(value: string | undefined, label: string): string {
  if (!value || !UUID_RE.test(value)) throw new NotFoundError(`Invalid ${label}`);
  return value;
}
