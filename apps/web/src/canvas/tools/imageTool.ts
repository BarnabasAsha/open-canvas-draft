import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { ImageNode, NodeId } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import { MIN_DRAW_SIZE, rectFromPoints } from "./dragToCreateTool";
import { toolManager } from "./toolManager";
import type { Tool, ToolPointerEvent } from "./toolTypes";

// Doesn't use createDragToCreateTool: every other shape tool commits
// synchronously at pointerup, but an image needs a file first — the draft
// (empty src) still lives in sceneStore the same way so it renders/tracks
// the drag for free, but committing to history and selecting it waits on
// an async file picker instead of happening immediately.
let draft: { id: NodeId; startPoint: Point; name: string } | null = null;

function buildDraftNode(id: NodeId, start: Point, current: Point, name: string): ImageNode {
  return {
    id,
    type: "image",
    name,
    parentId: null,
    ...rectFromPoints(start, current),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    src: "",
    objectFit: "cover",
  };
}

function onPointerDown({ scenePoint }: ToolPointerEvent): void {
  const id = generateId();
  const name = nextDefaultName(sceneStore.getState(), "Image");
  sceneStore.addNode(buildDraftNode(id, scenePoint, scenePoint, name));
  draft = { id, startPoint: scenePoint, name };
}

function onPointerMove({ scenePoint }: ToolPointerEvent): void {
  if (!draft) return;

  const node = buildDraftNode(draft.id, draft.startPoint, scenePoint, draft.name);
  const draftId = draft.id;

  sceneStore.update((scene) => {
    if (!scene.nodes[draftId]) return scene;
    return { ...scene, nodes: { ...scene.nodes, [draftId]: node } };
  });
}

function onPointerUp(): void {
  if (!draft) return;
  const { id } = draft;
  draft = null;

  const node = sceneStore.getState().nodes[id];
  toolManager.setActiveTool("select");

  if (!node) return;
  if (node.width < MIN_DRAW_SIZE || node.height < MIN_DRAW_SIZE) {
    sceneStore.removeNode(id);
    return;
  }

  pickImageFile(id);
}

function pickImageFile(nodeId: NodeId): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) {
      sceneStore.removeNode(nodeId);
      return;
    }
    readAsDataUrl(file, (dataUrl) => commitImage(nodeId, dataUrl));
  });

  // Supported in Chromium-based browsers; if it doesn't fire in some other
  // browser, the draft is simply left uncommitted rather than crashing —
  // a known gap, not attempted to be fully robust here.
  input.addEventListener("cancel", () => {
    sceneStore.removeNode(nodeId);
  });

  input.click();
}

function readAsDataUrl(file: File, onLoad: (dataUrl: string) => void): void {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onLoad(reader.result);
  };
  reader.readAsDataURL(file);
}

function commitImage(nodeId: NodeId, src: string): void {
  const node = sceneStore.getState().nodes[nodeId];
  if (!node) return;

  const finalNode = { ...node, src };
  sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [nodeId]: finalNode } }));

  historyManager.execute(createAddNodeCommand(finalNode));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([nodeId]) }));
}

function getCursor(): string {
  return "crosshair";
}

export const imageTool: Tool = { onPointerDown, onPointerMove, onPointerUp, getCursor };
