import { createAddNodeCommand, generateId, nextDefaultName } from "@open-canvas/commands";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { NodeId, SceneNode } from "@open-canvas/schema";
import type { Point } from "../../utils/coordinates";
import { toolManager } from "./toolManager";
import type { Tool, ToolPointerEvent } from "./toolTypes";

// Below this, a drag reads as an accidental click rather than an intentional
// draw, so the draft is discarded instead of committed.
export const MIN_DRAW_SIZE = 4;

interface DragToCreateOptions {
  // Given the drag's start and current point, build the full node. Bbox
  // shapes (rect/ellipse/frame/section) normalize the two points into
  // (x,y,width,height) themselves via rectFromPoints; line/arrow use start/
  // current directly as their two endpoints — the helper doesn't assume
  // either shape, it just calls this again on every pointermove.
  buildNode: (id: NodeId, start: Point, current: Point) => SceneNode;
  // Bbox shapes are too small if EITHER dimension is trivial; line/arrow
  // instead care about the distance between their two endpoints (a
  // perfectly horizontal or vertical line has a real height/width of 0,
  // which the bbox rule would wrongly discard). Defaults to the bbox rule.
  isTooSmall?: (node: SceneNode) => boolean;
}

// Shared by every "drag to define a shape" tool — frame, section, and the
// rect/ellipse/line/arrow tools. The node is created live in sceneStore at
// pointerdown (outside history) so the normal render/hit-test path draws it
// as it's dragged, for free, with no separate "draft" concept. Committing
// to history and switching back to the select tool only happens once, at
// pointerup, if the result is big enough to be a real shape.
export function createDragToCreateTool(options: DragToCreateOptions): Tool {
  // The default name is resolved once, at pointerdown, and reused for every
  // rebuild during the drag — recomputing it on each move would count the
  // draft node itself as an existing match and drift the number upward.
  let draft: { id: NodeId; startPoint: Point; name: string } | null = null;

  function onPointerDown({ scenePoint }: ToolPointerEvent): void {
    const id = generateId();
    const node = options.buildNode(id, scenePoint, scenePoint);
    const name = nextDefaultName(sceneStore.getState(), node.name);
    sceneStore.addNode({ ...node, name });
    draft = { id, startPoint: scenePoint, name };
  }

  function onPointerMove({ scenePoint }: ToolPointerEvent): void {
    if (!draft) return;

    const node = { ...options.buildNode(draft.id, draft.startPoint, scenePoint), name: draft.name };
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
    if (node) {
      const isTooSmall = options.isTooSmall ?? defaultIsTooSmall;
      if (isTooSmall(node)) {
        sceneStore.removeNode(id);
      } else {
        historyManager.execute(createAddNodeCommand(node));
        selectionStore.update((state) => ({ ...state, selectedIds: new Set([id]) }));
      }
    }

    toolManager.setActiveTool("select");
  }

  function getCursor(): string {
    return "crosshair";
  }

  return { onPointerDown, onPointerMove, onPointerUp, getCursor };
}

function defaultIsTooSmall(node: SceneNode): boolean {
  return node.width < MIN_DRAW_SIZE || node.height < MIN_DRAW_SIZE;
}

export function rectFromPoints(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
