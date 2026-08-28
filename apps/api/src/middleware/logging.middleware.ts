import { createMiddleware } from "hono/factory";
import { logger, runWithRequestLogger } from "../lib/logger";

export interface LoggingEnv {
  Variables: {
    requestId: string;
  };
}

// One child logger per request, bound with {requestId, method, url} —
// runs the rest of the pipeline inside runWithRequestLogger so any code
// anywhere downstream (routes, commands, error middleware) can call
// getRequestLogger() and get these bindings without a logger ever being
// threaded through a function signature or the DI graph. Runs BEFORE the
// InferDI scope middleware so createScope (index.ts) can read the same
// requestId back off `c` — one id, not two independently-generated ones.
export const loggingMiddleware = createMiddleware<LoggingEnv>(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  const requestLogger = logger.child({ requestId, method: c.req.method, url: c.req.path });
  await runWithRequestLogger(requestLogger, next);
});
