import { AsyncLocalStorage } from "node:async_hooks";
import pino, { type Logger } from "pino";

const usePretty =
  process.env.LOG_FORMAT === "pretty" || (!process.env.LOG_FORMAT && process.env.NODE_ENV !== "production");

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: usePretty ? { target: "pino-pretty" } : undefined,
});

// Request-scoped logging without threading a logger through every
// function signature. logging.middleware.ts builds a child logger with
// {requestId, method, url} once per request and runs the rest of the
// pipeline inside runWithRequestLogger(...), so any code anywhere in the
// call stack — commands, domain code, error handlers — can call
// getRequestLogger() and get correlated structured logs for free,
// without the DI graph or any function signature needing to carry one.
const als = new AsyncLocalStorage<Logger>();

export function getRequestLogger(): Logger {
  return als.getStore() ?? logger;
}

export function runWithRequestLogger<T>(requestLogger: Logger, fn: () => T): T {
  return als.run(requestLogger, fn);
}
