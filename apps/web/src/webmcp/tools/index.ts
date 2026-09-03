import { addElementTool } from "./addElement";
import { addIconTool } from "./addIcon";
import { addImageTool } from "./addImage";
import { addUnsplashPhotoTool } from "./addUnsplashPhoto";
import { arrangeElementsTool } from "./arrangeElements";
import { createPageTool } from "./createPage";
import { deleteElementsTool } from "./deleteElements";
import { duplicateElementsTool } from "./duplicateElements";
import { getCanvasStateTool } from "./getCanvasState";
import { groupElementsTool } from "./groupElements";
import { listAssetsTool } from "./listAssets";
import { listPagesTool } from "./listPages";
import { reorderElementsTool } from "./reorderElements";
import { reparentElementsTool } from "./reparentElements";
import { searchIconsTool } from "./searchIcons";
import { searchUnsplashPhotosTool } from "./searchUnsplashPhotos";
import { selectElementsTool } from "./selectElements";
import { switchPageTool } from "./switchPage";
import { ungroupElementTool } from "./ungroupElement";
import { updateElementTool } from "./updateElement";

// Every tool built so far — kept as its own list separate from
// DEFAULT_REGISTERED_TOOLS below so a future tool can be held back from
// registration (as delete_elements originally was) without deleting it.
export const ALL_TOOLS = [
  getCanvasStateTool,
  listAssetsTool,
  listPagesTool,
  addElementTool,
  addImageTool,
  addIconTool,
  searchIconsTool,
  addUnsplashPhotoTool,
  searchUnsplashPhotosTool,
  updateElementTool,
  deleteElementsTool,
  duplicateElementsTool,
  groupElementsTool,
  ungroupElementTool,
  arrangeElementsTool,
  reorderElementsTool,
  reparentElementsTool,
  selectElementsTool,
  switchPageTool,
  createPageTool,
];

// What actually gets registered via document.modelContext — every tool,
// delete_elements included. It was held back from the initial pass per the
// hackathon prep's "keep destructive ops out of v1" note, but it's exactly
// as undoable (Cmd+Z, historyManager) as every other mutating tool here —
// exposed now on request.
export const DEFAULT_REGISTERED_TOOLS = ALL_TOOLS;
