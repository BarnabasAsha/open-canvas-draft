import { Container } from "@inferdi/inferdi";
import { auth } from "../lib/auth";
import { db } from "../db/client";
import { logger } from "../lib/logger";
import { createR2ClientFromEnv } from "../lib/r2-client";
import type { RequestContext } from "../lib/request-context";
import { projectsModule } from "../modules/projects/projects.module";
import { pagesModule } from "../modules/projects/pages/pages.module";
import { assetsModule } from "../modules/projects/assets/assets.module";
import type { ScopeInput } from "./request-scope";

// Cross-cutting registrations only — db, logger, and the lazily-resolved
// requestContext every module depends on. Everything module-specific
// (repositories, commands, queries) lives in that module's own
// `*.module.ts` file and gets pulled in with `.use(...)` below — adding a
// new module later means one new file + one new `.use()` line here,
// nothing existing gets touched.
//
// `db` (`postgres` npm package / postgres.js) connects lazily on first
// query — no explicit "await pool ready" step needed, so it's a plain
// value, not an async factory. `requestContext` is the one genuinely
// async registration (calls auth.api.getSession, a DB round trip) — see
// its own comment below for why it's registered lazily rather than
// eagerly inside the Hono middleware's createScope.
export function buildRootContainer() {
  return new Container()
    .registerValue("db", db)
    .registerValue("logger", logger)
    // Stateless external client, same category as `db`/`logger`, but
    // registered as a lazy factory (not `registerValue`) rather than
    // built eagerly here — otherwise a missing R2 env var would crash the
    // ENTIRE api on startup (auth, projects, everything), not just asset
    // uploads. It only throws once something actually resolves it.
    .registerFactory("r2Client", () => createR2ClientFromEnv())
    .declareScopeInputs<{ request: ScopeInput }>()
    // Lazy: only actually resolves (and pays the session-lookup DB round
    // trip) when something downstream asks for it — requireAuth
    // middleware, or a Command/Query that depends on it. Routes that
    // never touch auth (e.g. /health) never trigger this at all.
    .registerAsyncFactory(
      "requestContext",
      async (request: ScopeInput): Promise<RequestContext> => {
        const result = await auth.api.getSession({ headers: request.headers });
        return { requestId: request.requestId, userId: result?.user.id ?? null, session: result };
      },
      ["request"],
      "scoped",
    )
    // pagesModule and assetsModule both depend on projectRepository (every
    // Page/Asset operation verifies ownership through its parent Project),
    // so this order matters — projectsModule must register first.
    .use(projectsModule)
    .use(pagesModule)
    .use(assetsModule);
}

export type RootContainer = ReturnType<typeof buildRootContainer>;

export function createRequestScope(root: RootContainer, request: ScopeInput) {
  return root.createScope({ request });
}

export type RequestContainer = ReturnType<typeof createRequestScope>;
