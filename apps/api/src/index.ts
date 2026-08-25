import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { documentsRoute } from "./routes/documents";

const app = new Hono()
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/documents", documentsRoute);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});

export default app;
