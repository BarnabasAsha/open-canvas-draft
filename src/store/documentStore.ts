import { createStore } from "./createStore";

export interface DocumentSettings {
  // null = transparent, rendered as a checkerboard — same convention as a
  // node's nullable fill.
  backgroundColor: string | null;
}

// Document-level settings, as opposed to a single node's properties —
// currently just the canvas background. Deliberately not undoable through
// historyManager: that manager's Command.apply/invert is typed against
// SceneGraph specifically, and a rarely-changed, trivially-reversible
// global setting like this doesn't carry the same "lost work" risk a node
// edit does.
const initialSettings: DocumentSettings = { backgroundColor: "#e5e5e5" };

export const documentStore = createStore<DocumentSettings>(initialSettings);
