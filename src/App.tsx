import { Canvas } from "./canvas/Canvas";
import { SelectionOverlay } from "./canvas/SelectionOverlay";
import { TextEditOverlay } from "./canvas/TextEditOverlay";
import type { AlignKind } from "./canvas/tools/alignment";
import { computeAlignedNodes } from "./canvas/tools/alignment";
import { toolManager } from "./canvas/tools/toolManager";
import { useActiveTool } from "./canvas/useActiveTool";
import { useKeyboardShortcuts } from "./canvas/useKeyboardShortcuts";
import { useSceneGraph } from "./canvas/useSceneGraph";
import { useSelection } from "./canvas/useSelection";
import { useDocumentSettings } from "./canvas/useDocumentSettings";
import { useViewport } from "./canvas/useViewport";
import { useZoomIndicatorVisible } from "./canvas/useZoomIndicatorVisible";
import { createMoveNodeCommand } from "./commands/MoveNodeCommand";
import { createSetNodeCommand } from "./commands/SetNodeCommand";
import { documentStore } from "./store/documentStore";
import { historyManager } from "./store/historyManager";
import { sceneStore } from "./store/sceneStore";
import { selectionStore } from "./store/selectionStore";
import { INITIAL_VIEWPORT, viewportStore } from "./store/viewportStore";
import type { NodeId, SceneNode } from "./types/scene";
import { LayersPanel } from "./ui/Sidebar/LeftSidebar/LayersPanel";
import { PropertiesPanel } from "./ui/Sidebar/RightSidebar/PropertiesPanel";
import { useNodeEdit } from "./ui/Sidebar/RightSidebar/useNodeEdit";
import { Toolbar } from "./ui/Toolbar/Toolbar";
import { ZoomIndicator } from "./ui/ZoomIndicator";

function selectLayer(id: NodeId, additive: boolean): void {
  selectionStore.update((state) => {
    if (!additive) return { ...state, selectedIds: new Set([id]) };

    const next = new Set(state.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { ...state, selectedIds: next };
  });
}

function toggleVisible(id: NodeId): void {
  const node = sceneStore.getState().nodes[id];
  if (!node) return;
  historyManager.execute(createSetNodeCommand(id, node, { ...node, visible: !node.visible }));
}

function toggleLocked(id: NodeId): void {
  const node = sceneStore.getState().nodes[id];
  if (!node) return;
  historyManager.execute(createSetNodeCommand(id, node, { ...node, locked: !node.locked }));
}

function renameLayer(id: NodeId, name: string): void {
  const node = sceneStore.getState().nodes[id];
  if (!node) return;
  historyManager.execute(createSetNodeCommand(id, node, { ...node, name }));
}

function alignSelection(kind: AlignKind): void {
  const { selectedIds } = selectionStore.getState();
  if (selectedIds.size < 2) return;

  const graph = sceneStore.getState();
  const updated = computeAlignedNodes([...selectedIds], graph, kind);
  if (updated.size === 0) return;

  const before = new Map<NodeId, SceneNode>();
  for (const id of updated.keys()) {
    const node = graph.nodes[id];
    if (node) before.set(id, node);
  }

  historyManager.execute(
    createMoveNodeCommand({ nodes: before, rootIds: graph.rootIds }, { nodes: updated, rootIds: graph.rootIds }),
  );
}

function setBackgroundColor(color: string | null): void {
  documentStore.update((settings) => ({ ...settings, backgroundColor: color }));
}

function resetViewport(): void {
  viewportStore.update(() => INITIAL_VIEWPORT);
}

export default function App() {
  useKeyboardShortcuts();

  const activeToolId = useActiveTool();
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();
  const documentSettings = useDocumentSettings();
  const viewport = useViewport();
  const zoomIndicatorVisible = useZoomIndicatorVisible(viewport.zoom);

  const selectedIdList = [...selectedIds];
  const soleSelectedNode = selectedIdList.length === 1 ? (scene.nodes[selectedIdList[0]] ?? null) : null;
  const nodeEdit = useNodeEdit(soleSelectedNode?.id ?? "");

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <LayersPanel
        scene={scene}
        selectedIds={selectedIds}
        onSelect={selectLayer}
        onToggleVisible={toggleVisible}
        onToggleLocked={toggleLocked}
        onRename={renameLayer}
      />
      <div
        className={documentSettings.backgroundColor ? undefined : "canvas-checkerboard"}
        style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}
      >
        <Canvas />
        <SelectionOverlay />
        <TextEditOverlay />
        <Toolbar activeToolId={activeToolId} onSelectTool={toolManager.setActiveTool} />
        <ZoomIndicator zoom={viewport.zoom} visible={zoomIndicatorVisible} onReset={resetViewport} />
      </div>
      <PropertiesPanel
        node={soleSelectedNode}
        selectionCount={selectedIdList.length}
        backgroundColor={documentSettings.backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        onFieldFocus={nodeEdit.onFieldFocus}
        onFieldChange={nodeEdit.onFieldChange}
        onFieldCommit={nodeEdit.onFieldCommit}
        onAlign={alignSelection}
      />
    </div>
  );
}
