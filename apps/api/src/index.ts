import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { InferdiHonoScopeEnv } from "@inferdi/hono";
import { inferdiHono } from "@inferdi/hono";
import { buildRootContainer, createRequestScope, type RequestContainer } from "./di/container";
import { errorMiddleware } from "./middleware/error.middleware";
import { loggingMiddleware, type LoggingEnv } from "./middleware/logging.middleware";
import { authRoutes } from "./modules/auth/routes";
import { projectRoutes } from "./modules/projects/routes";
import { unsplashRoutes } from "./modules/unsplash/routes";

const root = buildRootContainer();

type AppEnv = LoggingEnv & InferdiHonoScopeEnv<RequestContainer>;

const app = new Hono<AppEnv>();

const webUrl = process.env.WEB_URL ?? "http://localhost:5173";

app.use("*", loggingMiddleware);
app.use(
  "*",
  cors({
    origin: webUrl,
    credentials: true,
  }),
);
app.use(
  "*",
  // The <typeof root, LoggingEnv> type args are needed explicitly —
  // inferdiHono's `E` (existing Hono env visible to createScope) defaults
  // to the bare Env with no variables, so without this c.var.requestId
  // wouldn't type-check inside createScope below.
  inferdiHono<typeof root, LoggingEnv>({
    container: root,
    // Reads the SAME requestId loggingMiddleware already generated (see
    // that middleware's own comment) — one id correlates both the log
    // lines and the DI scope for a given request, not two independent
    // ones.
    createScope: (_root, c) =>
      createRequestScope(root, {
        requestId: c.var.requestId,
        headers: c.req.raw.headers,
      }),
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api/auth", authRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/unsplash", unsplashRoutes);

app.onError(errorMiddleware);

const port = Number(process.env.PORT ?? 5005);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});

export default app;
