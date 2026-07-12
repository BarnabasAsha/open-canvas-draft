import { createAddNodeCommand } from "../../commands/AddNodeCommand";
import { historyManager } from "../../store/historyManager";
import { sceneStore } from "../../store/sceneStore";
import { selectionStore } from "../../store/selectionStore";
import type { NodeId, SceneNode } from "../../types/scene";
import type { Point } from "../../utils/coordinates";
import { generateId } from "../../utils/id";
import { selectTool } from "./selectTool";
import { toolManager } from "./toolManager";
import type { Tool, ToolPointerEvent } from "./toolTypes";

// Below this, a drag reads as an accidental click rather than an intentional
// draw, so the draft is discarded instead of committed.
const MIN_DRAW_SIZE = 4;

interface DragToCreateOptions {
  buildNode: (id: NodeId, x: number, y: number, width: number, height: number) => SceneNode;
}

// Shared by frameTool/sectionTool now, and every "drag to define a rect"
// shape tool later — the node is created live in sceneStore at pointerdown
// (outside history) so the normal render/hit-test path draws it as it's
// dragged, for free, with no separate "draft" concept. Committing to
// history and switching back to the select tool only happens once, at
// pointerup, if the result is big enough to be a real shape.
export function createDragToCreateTool(options: DragToCreateOptions): Tool {
  let draft: { id: NodeId; startPoint: Point } | null = null;

  function onPointerDown({ scenePoint }: ToolPointerEvent): void {
    const id = generateId();
    sceneStore.addNode(options.buildNode(id, scenePoint.x, scenePoint.y, 0, 0));
    draft = { id, startPoint: scenePoint };
  }

  function onPointerMove({ scenePoint }: ToolPointerEvent): void {
    if (!draft) return;

    const rect = rectFromPoints(draft.startPoint, scenePoint);
    const draftId = draft.id;

    sceneStore.update((scene) => {
      const node = scene.nodes[draftId];
      if (!node) return scene;
      return { ...scene, nodes: { ...scene.nodes, [draftId]: { ...node, ...rect } } };
    });
  }

  function onPointerUp(): void {
    if (!draft) return;
    const { id } = draft;
    draft = null;

    const node = sceneStore.getState().nodes[id];
    if (node) {
      if (node.width < MIN_DRAW_SIZE || node.height < MIN_DRAW_SIZE) {
        sceneStore.removeNode(id);
      } else {
        historyManager.execute(createAddNodeCommand(node));
        selectionStore.update((state) => ({ ...state, selectedIds: new Set([id]) }));
      }
    }

    toolManager.setActiveTool(selectTool);
  }

  function getCursor(): string {
    return "crosshair";
  }

  return { onPointerDown, onPointerMove, onPointerUp, getCursor };
}

function rectFromPoints(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
