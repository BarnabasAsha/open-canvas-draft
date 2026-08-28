import { createMiddleware } from "hono/factory";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import type { RequestContainer } from "../di/container";

type Env = InferdiHonoScopeEnv<RequestContainer>;

// Resolving 'requestContext' here is what actually triggers the lazy
// session lookup (see container.ts) — routes that never apply this
// middleware never pay that cost. 401s if there's no authenticated user;
// otherwise the resolved RequestContext is already cached on the scope
// for every Command/Query in the same request to reuse for free.
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const requestContext = await c.var.di.getAsync("requestContext");
  if (!requestContext.userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
});
