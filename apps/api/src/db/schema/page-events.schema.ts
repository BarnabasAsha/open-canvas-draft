import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pages } from "./pages.schema";

// Append-only — a row here is never updated, only inserted, so unlike
// every other table there's no updatedAt and no attributes bag (nothing
// speculative to extend on an immutable historical fact). `event` is
// present only for kind "execute"; "undo"/"redo" entries need no payload —
// which prior "execute" they act on is implicit from log position, the
// same way createHistoryManager's own in-memory undo/redo stacks work.
export const pageEvents = pgTable("page_events", {
  id: uuid("id").primaryKey(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  event: jsonb("event"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PageEventRow = typeof pageEvents.$inferSelect;
