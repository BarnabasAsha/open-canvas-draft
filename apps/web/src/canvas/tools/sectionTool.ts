import type { SectionNode } from "@open-canvas/schema";
import { createDragToCreateTool, rectFromPoints } from "./dragToCreateTool";
import type { Tool } from "./toolTypes";

export const sectionTool: Tool = createDragToCreateTool({
  buildNode: (id, start, current): SectionNode => ({
    id,
    type: "section",
    name: "Section",
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: { tag: "section" },
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    layoutMode: "none",
    direction: "row",
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAxisAlign: "start",
    crossAxisAlign: "start",
    children: [],
  }),
});
