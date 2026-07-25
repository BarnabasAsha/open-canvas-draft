import { sceneStore } from "../../store/sceneStore";
import type { TextNode } from "../../types/scene";
import { generateId } from "../../utils/id";
import { nextDefaultName } from "../../utils/nodeNaming";
import { enterTextEdit } from "./textEdit";
import { toolManager } from "./toolManager";
import type { Tool, ToolPointerEvent } from "./toolTypes";

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 60;

function onPointerDown({ scenePoint }: ToolPointerEvent): void {
  const node: TextNode = {
    id: generateId(),
    type: "text",
    name: nextDefaultName(sceneStore.getState(), "Text"),
    parentId: null,
    x: scenePoint.x,
    y: scenePoint.y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    content: "",
    fontSize: 16,
    fontFamily: "sans-serif",
    fontWeight: 400,
    color: "#111827",
    align: "left",
  };

  sceneStore.addNode(node);
  toolManager.setActiveTool("select");
  enterTextEdit(node, true);
}

function onPointerMove(): void {}

function onPointerUp(): void {}

function getCursor(): string {
  return "text";
}

export const textTool: Tool = { onPointerDown, onPointerMove, onPointerUp, getCursor };
