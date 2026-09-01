import { addElementTool } from "./addElement";
import { addImageTool } from "./addImage";
import { arrangeElementsTool } from "./arrangeElements";
import { createPageTool } from "./createPage";
import { deleteElementsTool } from "./deleteElements";
import { duplicateElementsTool } from "./duplicateElements";
import { getCanvasStateTool } from "./getCanvasState";
import { groupElementsTool } from "./groupElements";
import { listAssetsTool } from "./listAssets";
import { listPagesTool } from "./listPages";
import { reorderElementsTool } from "./reorderElements";
import { selectElementsTool } from "./selectElements";
import { switchPageTool } from "./switchPage";
import { ungroupElementTool } from "./ungroupElement";
import { updateElementTool } from "./updateElement";

// Every tool built for this pass — always kept complete, even the ones not
// currently registered by default (see DEFAULT_REGISTERED_TOOLS), so
// widening what's exposed later is a one-line change here, not new code.
export const ALL_TOOLS = [
  getCanvasStateTool,
  listAssetsTool,
  listPagesTool,
  addElementTool,
  addImageTool,
  updateElementTool,
  deleteElementsTool,
  duplicateElementsTool,
  groupElementsTool,
  ungroupElementTool,
  arrangeElementsTool,
  reorderElementsTool,
  selectElementsTool,
  switchPageTool,
  createPageTool,
];

// What actually gets registered via document.modelContext — everything
// except delete_elements, kept out for now per the "keep destructive ops
// out of v1" note from the hackathon prep (undo still reverses it either
// way; this is about not exposing it to an agent by default, not about it
// being unsafe).
export const DEFAULT_REGISTERED_TOOLS = ALL_TOOLS.filter((tool) => tool.name !== "delete_elements");
