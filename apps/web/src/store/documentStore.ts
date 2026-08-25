import { createStore } from "./createStore";

export interface DocumentSettings {
  // null = transparent, rendered as a checkerboard — same convention as a
  // node's nullable fill.
  backgroundColor: string | null;
  gridVisible: boolean;
  rulerVisible: boolean;
}

// Document-level settings, as opposed to a single node's properties —
// currently just the canvas background and the grid/ruler toggles.
// Deliberately not undoable through historyManager: that manager's
// Command.apply/invert is typed against SceneGraph specifically, and a
// rarely-changed, trivially-reversible global setting like this doesn't
// carry the same "lost work" risk a node edit does.
const initialSettings: DocumentSettings = { backgroundColor: "#e5e5e5", gridVisible: false, rulerVisible: true };

export const documentStore = createStore<DocumentSettings>(initialSettings);
