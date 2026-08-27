import { Hono } from "hono";
import { auth } from "../../lib/auth";

// Better Auth uses Web Standard APIs, so no adapter is needed — just
// forward the raw Request and let it own the entire /api/auth/* surface
// (sign-in, callback, sign-out, session). No custom auth logic lives
// here or anywhere else in this codebase.
export const authRoutes = new Hono().all("/*", (c) => auth.handler(c.req.raw));
