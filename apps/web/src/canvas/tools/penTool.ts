import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { NodeId, PathNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import type { DraftAnchor } from "./penPath";
import { isNearPoint, mirrorHandle, rebaseAnchors } from "./penPath";
import { toolManager } from "./toolManager";
import type { Tool, ToolPointerEvent } from "./toolTypes";

// Below this drag distance, a click-and-slightly-jitter reads as a plain
// anchor placement rather than a deliberate handle pull — same threshold
// philosophy as dragToCreateTool's MIN_DRAW_SIZE.
const MIN_DRAG_FOR_HANDLE = 4;
// A closed path needs at least a triangle to mean anything, and clicking
// within this many scene units of the start anchor is what triggers it.
const CLOSE_HIT_RADIUS = 10;

interface PenSession {
  nodeId: NodeId;
  anchors: DraftAnchor[];
  name: string;
}

let session: PenSession | null = null;
// Scene point where the CURRENT (not yet committed) anchor's pointerdown
// happened — set between pointerdown and pointerup while placing one
// anchor; null while just hovering between clicks.
let placingFrom: Point | null = null;

function onPointerDown({ scenePoint }: ToolPointerEvent): void {
  if (session && session.anchors.length >= 3 && isNearPoint(scenePoint, session.anchors[0].point, CLOSE_HIT_RADIUS)) {
    finishSession(true);
    return;
  }

  placingFrom = scenePoint;

  if (!session) {
    const nodeId = generateId();
    const name = nextDefaultName(sceneStore.getState(), "Path");
    session = { nodeId, anchors: [], name };
    sceneStore.addNode(buildPathNode(nodeId, [{ point: scenePoint }], name));
  } else {
    refreshDraft([...session.anchors, { point: scenePoint }]);
  }
}

function onPointerMove({ scenePoint }: ToolPointerEvent): void {
  if (!session) return;

  const previewAnchor = placingFrom ? buildPlacementAnchor(placingFrom, scenePoint) : { point: scenePoint };
  refreshDraft([...session.anchors, previewAnchor]);
}

function onPointerUp({ scenePoint }: ToolPointerEvent): void {
  if (!session || !placingFrom) return;

  session.anchors.push(buildPlacementAnchor(placingFrom, scenePoint));
  placingFrom = null;
  refreshDraft(session.anchors);
}

function onKeyDown(e: KeyboardEvent): void {
  if (!session) {
    // No path in progress — Escape is otherwise a dead end here, since the
    // pen tool (unlike every other creation tool) doesn't auto-switch back
    // to select after finishing a path. Without this, there was no
    // keyboard way out of pen mode at all.
    if (e.key === "Escape") {
      e.preventDefault();
      toolManager.setActiveTool("select");
    }
    return;
  }

  if (e.key === "Enter") {
    e.preventDefault();
    finishSession(false);
  } else if (e.key === "Escape") {
    e.preventDefault();
    cancelSession();
  }
}

function onDeactivate(): void {
  cancelSession();
}

function getCursor(): string {
  return "crosshair";
}

function buildPlacementAnchor(from: Point, current: Point): DraftAnchor {
  const dragDistance = Math.hypot(current.x - from.x, current.y - from.y);
  if (dragDistance < MIN_DRAG_FOR_HANDLE) return { point: from };
  return { point: from, handleOut: current, handleIn: mirrorHandle(from, current) };
}

function refreshDraft(anchors: DraftAnchor[]): void {
  if (!session) return;
  const node = buildPathNode(session.nodeId, anchors, session.name);
  const nodeId = session.nodeId;

  sceneStore.update((scene) => {
    if (!scene.nodes[nodeId]) return scene;
    return { ...scene, nodes: { ...scene.nodes, [nodeId]: node } };
  });
}

function buildPathNode(nodeId: NodeId, anchors: DraftAnchor[], name: string): PathNode {
  const { origin, width, height, points } = rebaseAnchors(anchors);
  return {
    id: nodeId,
    type: "path",
    name,
    parentId: null,
    x: origin.x,
    y: origin.y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    points,
    closed: false,
    fill: null,
    stroke: "#111827",
    strokeWidth: 2,
    strokeStyle: "solid",
  };
}

function finishSession(closed: boolean): void {
  if (!session) return;
  const { nodeId, anchors, name } = session;
  session = null;
  placingFrom = null;

  // A path with one point isn't a shape — same "discard an accidental
  // click" rule every other creation tool follows.
  if (anchors.length < 2) {
    sceneStore.removeNode(nodeId);
    return;
  }

  const node: PathNode = { ...buildPathNode(nodeId, anchors, name), closed };
  sceneStore.update((scene) => ({ ...scene, nodes: { ...scene.nodes, [nodeId]: node } }));

  historyManager.execute(createAddNodeCommand(node));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([nodeId]) }));
}

function cancelSession(): void {
  if (!session) return;
  sceneStore.removeNode(session.nodeId);
  session = null;
  placingFrom = null;
}

export const penTool: Tool = {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
  onDeactivate,
  getCursor,
};
