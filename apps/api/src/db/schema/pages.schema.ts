import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.schema";

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // @open-canvas/schema's SceneGraph shape ({nodes, rootIds}) — validated
  // against SceneGraphSchema in PageMapper.toDomain before it ever
  // becomes a PageModel, so a corrupt row fails loudly instead of
  // silently propagating a malformed scene graph to the frontend.
  sceneGraph: jsonb("scene_graph").notNull(),
  attributes: jsonb("attributes").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PageRow = typeof pages.$inferSelect;
