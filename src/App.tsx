import { Canvas } from "./canvas/Canvas";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./canvas/canvasSize";
import { SelectionOverlay } from "./canvas/SelectionOverlay";
import { toolManager } from "./canvas/tools/toolManager";
import { useActiveTool } from "./canvas/useActiveTool";
import { useKeyboardShortcuts } from "./canvas/useKeyboardShortcuts";
import { useSceneGraph } from "./canvas/useSceneGraph";
import { useSelection } from "./canvas/useSelection";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Toolbar } from "./components/Toolbar";

export default function App() {
  useKeyboardShortcuts();

  const activeToolId = useActiveTool();
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();

  const selectedIdList = [...selectedIds];
  const soleSelectedNode = selectedIdList.length === 1 ? (scene.nodes[selectedIdList[0]] ?? null) : null;

  return (
    <div style={{ position: "relative", width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <Canvas />
      <SelectionOverlay />
      <Toolbar activeToolId={activeToolId} onSelectTool={toolManager.setActiveTool} />
      <PropertiesPanel node={soleSelectedNode} selectionCount={selectedIdList.length} />
    </div>
  );
}
