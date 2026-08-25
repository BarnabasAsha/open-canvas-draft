import { Canvas } from "./canvas/Canvas";
import { canvasSizeStore } from "./canvas/canvasSizeStore";
import { RULER_SIZE, Ruler } from "./canvas/Ruler";
import { SelectionOverlay } from "./canvas/SelectionOverlay";
import { TextEditOverlay } from "./canvas/TextEditOverlay";
import type { AlignKind } from "./canvas/tools/alignment";
import { computeAlignedNodes, computeAlignedToContainer, isAlignableContainer } from "./canvas/tools/alignment";
import type { UiPrimitiveKind } from "./canvas/primitives/builtInComponents";
import { BUILT_IN_COMPONENT_IDS } from "./canvas/primitives/builtInComponents";
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
import {
  createAddNodeCommand,
  createInstanceNode,
  createMoveNodeCommand,
  createSetNodeCommand,
  generateId,
  nextDefaultName,
  parseVirtualId,
  type VirtualId,
} from "@open-canvas/commands";
import { documentStore } from "./store/documentStore";
import { historyManager } from "./store/historyManager";
import {
  addPage,
  deletePage,
  renamePage,
  switchToPage as switchActivePage,
  type PageId,
} from "./store/pagesStore";
import { getComponent } from "./store/componentsStore";
import { reconcileGroupBounds } from "./store/reconcileGroupBounds";
import { sceneStore } from "./store/sceneStore";
import { selectionStore } from "./store/selectionStore";
import { viewportStore } from "./store/viewportStore";
import type { NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { INITIAL_VIEWPORT, screenToScene } from "./utils/coordinates";
import { LeftSidebar } from "./ui/Sidebar/LeftSidebar/LeftSidebar";
import { PropertiesPanel } from "./ui/Sidebar/RightSidebar/PropertiesPanel";
import { useInstanceOverrideEdit } from "./ui/Sidebar/RightSidebar/useInstanceOverrideEdit";
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

// Same idea as toggleVisible, but for a node INSIDE a component instance's
// definition — there's no real graph node to flip, so this writes a
// `visible` override on the owning instance instead. This is how a
// Checkbox/Radio/Toggle's "on" state actually works now: showing the
// Check/Dot/moved Thumb is just toggling that one child's visibility, the
// same interaction as any other layer.
function toggleInstanceChildVisible(instanceId: NodeId, defNodeId: NodeId): void {
  const instance = sceneStore.getState().nodes[instanceId];
  if (!instance || instance.type !== "instance") return;

  const definition = getComponent(instance.componentId);
  const defNode = definition?.nodes[defNodeId];
  if (!defNode) return;

  const currentOverride = instance.overrides[defNodeId] as { visible?: boolean } | undefined;
  const currentVisible = currentOverride?.visible ?? defNode.visible;
  const nextInstance = {
    ...instance,
    overrides: { ...instance.overrides, [defNodeId]: { ...instance.overrides[defNodeId], visible: !currentVisible } },
  };
  historyManager.execute(createSetNodeCommand(instanceId, instance, nextInstance));
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

// Same "fixed size, centered on the visible canvas" placement as
// placeFramePreset above, generalized across every UI primitive kind via
// the UI_PRIMITIVES table instead of one function per kind.
// Placing "Button" creates an instance of the SAME built-in Button
// component every other placed Button instances too — not a one-off node —
// so it gets exactly the editing story any other component/instance pair
// already has (see builtInComponents.ts).
function placeUiPrimitive(kind: UiPrimitiveKind): void {
  const definition = getComponent(BUILT_IN_COMPONENT_IDS[kind]);
  if (!definition) return;

  const { width: canvasWidth, height: canvasHeight } = canvasSizeStore.getState();
  const sceneCenter = screenToScene({ x: canvasWidth / 2, y: canvasHeight / 2 }, viewportStore.getState());
  const graph = sceneStore.getState();

  const instance = createInstanceNode(
    generateId(),
    nextDefaultName(graph, definition.name),
    sceneCenter.x - definition.width / 2,
    sceneCenter.y - definition.height / 2,
    definition.width,
    definition.height,
    definition,
  );

  historyManager.execute(createAddNodeCommand(instance));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([instance.id]) }));
  toolManager.setActiveTool("select");
}

function resetViewport(): void {
  viewportStore.update(() => INITIAL_VIEWPORT);
}

// A selected id inside a component instance (see instanceVirtualId.ts)
// doesn't name a real graph node — this synthesizes one for display, by
// merging the instance's override on top of whatever the definition
// itself authored, the same precedence resolveInstance.ts uses to render it.
function resolveVirtualSelection(virtual: VirtualId, scene: SceneGraph): SceneNode | null {
  const instance = scene.nodes[virtual.instanceId];
  if (!instance || instance.type !== "instance") return null;

  const definition = getComponent(instance.componentId);
  const defNode = definition?.nodes[virtual.defNodeId];
  if (!defNode) return null;

  const override = instance.overrides[virtual.defNodeId] as Record<string, unknown> | undefined;
  return { ...defNode, ...override } as SceneNode;
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
  const soleSelectedId = selectedIdList.length === 1 ? selectedIdList[0] : null;
  const virtualSelection = soleSelectedId ? parseVirtualId(soleSelectedId) : null;
  const soleSelectedNode = virtualSelection
    ? resolveVirtualSelection(virtualSelection, scene)
    : soleSelectedId
      ? (scene.nodes[soleSelectedId] ?? null)
      : null;

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

  // Hooks can't be called conditionally, so all three are always
  // instantiated; whichever applies is picked below. Neither does anything
  // when handed an empty id (single/instance-child) or id list (multi/shared).
  const singleNodeEdit = useNodeEdit(!virtualSelection && soleSelectedId ? soleSelectedId : "");
  const instanceChildEdit = useInstanceOverrideEdit(virtualSelection?.instanceId ?? "", virtualSelection?.defNodeId ?? "");
  const multiNodeEdit = useMultiNodeEdit(uniformNode ? uniformNodeIds : []);
  const activeSingleEdit = virtualSelection ? instanceChildEdit : singleNodeEdit;

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
        onToggleInstanceChildVisible={toggleInstanceChildVisible}
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
          <Toolbar
            activeToolId={activeToolId}
            onSelectTool={toolManager.setActiveTool}
            onSelectFramePreset={placeFramePreset}
            onSelectPrimitive={placeUiPrimitive}
          />
          <ZoomIndicator zoom={viewport.zoom} visible={zoomIndicatorVisible} onReset={resetViewport} />
        </div>
      </div>
      <PropertiesPanel
        node={soleSelectedNode}
        selectionCount={selectedIdList.length}
        uniformNode={uniformNode}
        isInstanceChild={virtualSelection !== null}
        backgroundColor={documentSettings.backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        gridVisible={documentSettings.gridVisible}
        onGridVisibleChange={setGridVisible}
        rulerVisible={documentSettings.rulerVisible}
        onRulerVisibleChange={setRulerVisible}
        onFieldFocus={activeSingleEdit.onFieldFocus}
        onFieldChange={activeSingleEdit.onFieldChange}
        onFieldCommit={activeSingleEdit.onFieldCommit}
        onSharedFieldFocus={multiNodeEdit.onFieldFocus}
        onSharedFieldChange={multiNodeEdit.onFieldChange}
        onSharedFieldCommit={multiNodeEdit.onFieldCommit}
        onAlign={alignSelection}
      />
    </div>
  );
}
