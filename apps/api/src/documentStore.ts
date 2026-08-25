import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SceneGraph } from "@open-canvas/schema";

// Deliberately a single local JSON file, not a real database — Phase 5's
// own scope. Drizzle is the intended ORM once real persistence work
// happens; this file is what it will replace, so nothing here should grow
// a bespoke query/indexing layer that Drizzle would just replace.
const DATA_FILE = new URL("../data/documents.json", import.meta.url).pathname;

interface StoredDocument {
  id: string;
  graph: SceneGraph;
  createdAt: string;
}

type DocumentsFile = Record<string, StoredDocument>;

function readAll(): DocumentsFile {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeAll(documents: DocumentsFile): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(documents, null, 2));
}

export function saveDocument(id: string, graph: SceneGraph): StoredDocument {
  const documents = readAll();
  const document: StoredDocument = { id, graph, createdAt: new Date().toISOString() };
  documents[id] = document;
  writeAll(documents);
  return document;
}

export function getDocument(id: string): StoredDocument | null {
  return readAll()[id] ?? null;
}
