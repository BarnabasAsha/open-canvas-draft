import type { Command } from "../commands/Command";
import { sceneStore } from "./sceneStore";

let undoStack: Command[] = [];
let redoStack: Command[] = [];

function execute(command: Command): void {
  sceneStore.update((graph) => command.apply(graph));
  undoStack.push(command);
  redoStack = [];
}

function undo(): void {
  const command = undoStack.pop();
  if (!command) return;

  sceneStore.update((graph) => command.invert(graph));
  redoStack.push(command);
}

function redo(): void {
  const command = redoStack.pop();
  if (!command) return;

  sceneStore.update((graph) => command.apply(graph));
  undoStack.push(command);
}

export const historyManager = { execute, undo, redo };
