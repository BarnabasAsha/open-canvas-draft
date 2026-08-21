import { Canvas } from "./canvas/Canvas";
import { canvasSizeStore } from "./canvas/canvasSizeStore";
import { RULER_SIZE, Ruler } from "./canvas/Ruler";
import { SelectionOverlay } from "./canvas/SelectionOverlay";
import { TextEditOverlay } from "./canvas/TextEditOverlay";
import type { AlignKind } from "./canvas/tools/alignment";
import { computeAlignedNodes, computeAlignedToContainer, isAlignableContainer } from "./canvas/tools/alignment";
import type { FramePreset } from "./canvas/tools/framePresets";
import { buildFrameNode } from "./canvas/tools/frameTool";
import { toolManager } from "./canvas/tools/toolManager";
import { useActiveTool } from "./canvas/useActiveTool";
import { useKeyboardShortcuts } from "./canvas/useKeyboardShortcuts";
import { useSceneGraph } from "./canvas/useSceneGraph";
import { useSelection } from "./canvas/useSelection";
import { useDocumentSettings } from "./canvas/useDocumentSettings";
import { useViewport } from "./canvas/useViewport";
import { useZoomIndicatorVisible } from "./canvas/useZoomIndicatorVisible";
import { usePages } from "./canvas/usePages";
import { createAddNodeCommand } from "./commands/AddNodeCommand";
import { createMoveNodeCommand } from "./commands/MoveNodeCommand";
import { createSetNodeCommand } from "./commands/SetNodeCommand";
import { documentStore } from "./store/documentStore";
import { historyManager } from "./store/historyManager";
import {
  addPage,
  deletePage,
  renamePage,
  switchToPage as switchActivePage,
  type PageId,
} from "./store/pagesStore";
import { reconcileGroupBounds } from "./store/reconcileGroupBounds";
import { sceneStore } from "./store/sceneStore";
import { selectionStore } from "./store/selectionStore";
import { viewportStore } from "./store/viewportStore";
import type { NodeId, SceneNode } from "./types/scene";
import { INITIAL_VIEWPORT, screenToScene } from "./utils/coordinates";
import { generateId } from "./utils/id";
import { nextDefaultName } from "./utils/nodeNaming";
import { LeftSidebar } from "./ui/Sidebar/LeftSidebar/LeftSidebar";
import { PropertiesPanel } from "./ui/Sidebar/RightSidebar/PropertiesPanel";
import { useMultiNodeEdit } from "./ui/Sidebar/RightSidebar/useMultiNodeEdit";
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
  const graph = sceneStore.getState();

  // A single selected container aligns its own children to itself
  // (matching Figma); 2+ selected nodes align relative to each other.
  // Anything else (0 or 1 non-container node) has nothing to align.
  const patch =
    selectedIds.size === 1
      ? computeAlignedToContainer([...selectedIds][0], graph, kind)
      : selectedIds.size > 1
        ? computeAlignedNodes([...selectedIds], graph, kind)
        : new Map<NodeId, SceneNode>();
  if (patch.size === 0) return;

  // Reconciling here (rather than letting sceneStore.update do it as a
  // side effect of historyManager.execute) lets the command capture every
  // node the reconcile pass actually touches — including an auto-fit
  // group's own box, and sibling children this align didn't move directly
  // but got shifted to compensate. Diffing the whole graph rather than
  // just `patch`'s keys is what catches those: without it, undo could
  // restore the nodes we intended to move while leaving the group box (or
  // an untouched sibling) desynced in its post-align state.
  const patchedNodes = { ...graph.nodes };
  for (const [id, node] of patch) patchedNodes[id] = node;
  const reconciled = reconcileGroupBounds({ ...graph, nodes: patchedNodes });

  const before = new Map<NodeId, SceneNode>();
  const after = new Map<NodeId, SceneNode>();
  for (const id of Object.keys(reconciled.nodes)) {
    if (reconciled.nodes[id] !== graph.nodes[id]) {
      before.set(id, graph.nodes[id]);
      after.set(id, reconciled.nodes[id]);
    }
  }
  if (after.size === 0) return;

  historyManager.execute(
    createMoveNodeCommand({ nodes: before, rootIds: graph.rootIds }, { nodes: after, rootIds: graph.rootIds }),
  );
}

function setBackgroundColor(color: string | null): void {
  documentStore.update((settings) => ({ ...settings, backgroundColor: color }));
}

function setGridVisible(visible: boolean): void {
  documentStore.update((settings) => ({ ...settings, gridVisible: visible }));
}

function setRulerVisible(visible: boolean): void {
  documentStore.update((settings) => ({ ...settings, rulerVisible: visible }));
}

// Places a frame already sized to a real device rather than dragging one
// out by hand — centered on whatever's currently in view, same "center of
// the visible canvas" anchor the keyboard zoom shortcuts already use.
function placeFramePreset(preset: FramePreset): void {
  const { width: canvasWidth, height: canvasHeight } = canvasSizeStore.getState();
  const sceneCenter = screenToScene({ x: canvasWidth / 2, y: canvasHeight / 2 }, viewportStore.getState());

  const graph = sceneStore.getState();
  const node = buildFrameNode(
    generateId(),
    nextDefaultName(graph, preset.name),
    sceneCenter.x - preset.width / 2,
    sceneCenter.y - preset.height / 2,
    preset.width,
    preset.height,
  );

  historyManager.execute(createAddNodeCommand(node));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));
  toolManager.setActiveTool("select");
}

function resetViewport(): void {
  viewportStore.update(() => INITIAL_VIEWPORT);
}

// Blurring first flushes an in-progress text edit through its existing
// onBlur commit — the same thing that already happens when you click
// anywhere else on the page, just triggered here instead of by a real click.
function switchToPage(id: PageId): void {
  (document.activeElement as HTMLElement | null)?.blur();
  switchActivePage(id);
}

export default function App() {
  useKeyboardShortcuts();

  const activeToolId = useActiveTool();
  const { pages, activePageId } = usePages();
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();
  const documentSettings = useDocumentSettings();
  const viewport = useViewport();
  const zoomIndicatorVisible = useZoomIndicatorVisible(viewport.zoom);

  const selectedIdList = [...selectedIds];
  const soleSelectedNode = selectedIdList.length === 1 ? (scene.nodes[selectedIdList[0]] ?? null) : null;

  // A same-type multi-selection (e.g. two Text nodes) can share style
  // fields — see the PropertiesPanel doc comment for what's shown and why
  // Position isn't. uniformNode is just the first one, standing in for
  // "what type/shape of fields to render"; the actual values written come
  // from useMultiNodeEdit applying to every id in uniformNodeIds.
  const directSelectedNodes = selectedIdList.map((id) => scene.nodes[id]).filter((n): n is SceneNode => n !== undefined);
  const directUniformNode =
    directSelectedNodes.length > 1 && directSelectedNodes.every((n) => n.type === directSelectedNodes[0].type)
      ? directSelectedNodes[0]
      : null;

  // Same idea, one level down: a single selected Frame/Section/Group whose
  // own children are all the same type can have THEIR shared style edited
  // too (e.g. selecting the "Nav Links" group and setting one font/color
  // for all three link texts inside it) — the same "operate on a lone
  // container's children" pattern Align already uses.
  const containerChildIds = soleSelectedNode && isAlignableContainer(soleSelectedNode) ? soleSelectedNode.children : [];
  const containerChildNodes = containerChildIds.map((id) => scene.nodes[id]).filter((n): n is SceneNode => n !== undefined);
  const containerUniformNode =
    containerChildNodes.length > 0 && containerChildNodes.every((n) => n.type === containerChildNodes[0].type)
      ? containerChildNodes[0]
      : null;

  const uniformNode = directUniformNode ?? containerUniformNode;
  const uniformNodeIds = directUniformNode ? selectedIdList : containerChildIds;

  // Hooks can't be called conditionally, so both are always instantiated;
  // whichever one applies is picked below. Neither does anything when
  // handed an empty id (single) or id list (multi/shared).
  const singleNodeEdit = useNodeEdit(soleSelectedNode?.id ?? "");
  const multiNodeEdit = useMultiNodeEdit(uniformNode ? uniformNodeIds : []);

  const rulerSize = documentSettings.rulerVisible ? RULER_SIZE : 0;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <LeftSidebar
        pages={pages.map((page) => ({ id: page.id, name: page.name }))}
        activePageId={activePageId}
        onSwitchPage={switchToPage}
        onAddPage={addPage}
        onRenamePage={renamePage}
        onDeletePage={deletePage}
        scene={scene}
        selectedIds={selectedIds}
        onSelect={selectLayer}
        onToggleVisible={toggleVisible}
        onToggleLocked={toggleLocked}
        onRename={renameLayer}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "grid",
          gridTemplateColumns: `${rulerSize}px 1fr`,
          gridTemplateRows: `${rulerSize}px 1fr`,
        }}
      >
        {documentSettings.rulerVisible && <Ruler />}
        <div
          className={documentSettings.backgroundColor ? undefined : "canvas-checkerboard"}
          style={{ position: "relative", gridColumn: 2, gridRow: 2, minWidth: 0, minHeight: 0 }}
        >
          <Canvas />
          <SelectionOverlay />
          <TextEditOverlay />
          <Toolbar activeToolId={activeToolId} onSelectTool={toolManager.setActiveTool} onSelectFramePreset={placeFramePreset} />
          <ZoomIndicator zoom={viewport.zoom} visible={zoomIndicatorVisible} onReset={resetViewport} />
        </div>
      </div>
      <PropertiesPanel
        node={soleSelectedNode}
        selectionCount={selectedIdList.length}
        uniformNode={uniformNode}
        backgroundColor={documentSettings.backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        gridVisible={documentSettings.gridVisible}
        onGridVisibleChange={setGridVisible}
        rulerVisible={documentSettings.rulerVisible}
        onRulerVisibleChange={setRulerVisible}
        onFieldFocus={singleNodeEdit.onFieldFocus}
        onFieldChange={singleNodeEdit.onFieldChange}
        onFieldCommit={singleNodeEdit.onFieldCommit}
        onSharedFieldFocus={multiNodeEdit.onFieldFocus}
        onSharedFieldChange={multiNodeEdit.onFieldChange}
        onSharedFieldCommit={multiNodeEdit.onFieldCommit}
        onAlign={alignSelection}
      />
    </div>
  );
}
