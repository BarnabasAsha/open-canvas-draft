import { zValidator } from "@hono/zod-validator";
import { SceneGraphSchema } from "@open-canvas/schema";
import type { SceneGraph } from "@open-canvas/schema";
import { Hono } from "hono";
import { v7 as uuidv7 } from "uuid";
import { getDocument, saveDocument } from "../documentStore";

export const documentsRoute = new Hono()
  .post("/", zValidator("json", SceneGraphSchema), (c) => {
    // zValidator's inferred type is SceneGraphSchema's raw z.infer (e.g.
    // semantics.tag as `string`) — narrower than the hand-refined
    // `SceneGraph` type (`SemanticTag`) exported alongside it, per the
    // RefineSemantics comment in @open-canvas/schema/src/index.ts: Zod
    // can't runtime-check the full `keyof HTMLElementTagNameMap` union, so
    // it's only checked as a string. The value has already been
    // shape-validated by this point, so this cast is a boundary-crossing
    // widening, not a hole in validation.
    const graph = c.req.valid("json") as SceneGraph;
    const document = saveDocument(uuidv7(), graph);
    return c.json(document, 201);
  })
  .get("/:id", (c) => {
    const document = getDocument(c.req.param("id"));
    if (!document) return c.json({ error: "Document not found" }, 404);
    return c.json(document);
  });
