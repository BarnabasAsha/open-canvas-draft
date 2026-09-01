import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { authClient } from "../lib/authClient";
import { fetchJson } from "../lib/api";
import { type Asset, deleteAsset, listAssets, uploadAsset } from "../lib/assets";
import { downloadTextFile } from "../lib/downloadFile";
import { createPage as createPageOnServer, exportFrameToHtml, listPages } from "../lib/pages";
import { initPageAutosave } from "../store/pageAutosave";
import { initPageEventLog } from "../store/pageEventLog";
import { initWebMcpTools } from "../webmcp/registerTools";
import { setThemePreference } from "../store/themeStore";
import { useTheme } from "../store/useTheme";
import { useSaveStatus } from "../store/useSaveStatus";
import type { Project } from "../ui/ProjectList/ProjectList";
import { Canvas } from "../canvas/Canvas";
import { canvasSizeStore } from "../canvas/canvasSizeStore";
import { RULER_SIZE, Ruler } from "../canvas/Ruler/Ruler";
import { setCurrentProjectId } from "../store/currentProject";
import { FlexInsertionIndicator } from "../canvas/FlexInsertionIndicator";
import { SelectionOverlay } from "../canvas/SelectionOverlay";
import { TextEditOverlay } from "../canvas/TextEditOverlay";
import type { AlignKind } from "../canvas/tools/alignment";
import { computeAlignedNodes, computeAlignedToContainer } from "../canvas/tools/alignment";
import type { UiPrimitiveKind } from "../canvas/primitives/builtInComponents";
import { BUILT_IN_COMPONENT_IDS } from "../canvas/primitives/builtInComponents";
import type { FramePreset } from "../canvas/tools/framePresets";
import { buildFrameNode } from "../canvas/tools/buildFrameNode";
import { toolManager } from "../canvas/tools/toolManager";
import { useActiveTool } from "../canvas/useActiveTool";
import { useKeyboardShortcuts } from "../canvas/useKeyboardShortcuts";
import { useSceneGraph } from "../canvas/useSceneGraph";
import { useSelection } from "../canvas/useSelection";
import { useDocumentSettings } from "../canvas/useDocumentSettings";
import { useViewport } from "../canvas/useViewport";
import { useZoomIndicatorVisible } from "../canvas/useZoomIndicatorVisible";
import { usePages } from "../canvas/usePages";
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
import { documentStore } from "../store/documentStore";
import { historyManager } from "../store/historyManager";
import {
  addPage,
  deletePage,
  EMPTY_SCENE,
  hydratePages,
  renamePage,
  switchToPage as switchActivePage,
  type PageId,
} from "../store/pagesStore";
import { componentsStore, getComponent } from "../store/componentsStore";
import { reconcileGroupBounds } from "../store/reconcileGroupBounds";
import { sceneStore } from "../store/sceneStore";
import { selectionStore } from "../store/selectionStore";
import { viewportStore } from "../store/viewportStore";
import type { ImageNode, NodeId, SceneGraph, SceneNode } from "@open-canvas/schema";
import { INITIAL_VIEWPORT, screenToScene } from "../utils/coordinates";
import { LeftSidebar } from "../ui/Sidebar/LeftSidebar/LeftSidebar";
import { PropertiesPanel } from "../ui/Sidebar/RightSidebar/PropertiesPanel/PropertiesPanel";
import { useInstanceOverrideEdit } from "../ui/Sidebar/RightSidebar/useInstanceOverrideEdit";
import { useMultiNodeEdit } from "../ui/Sidebar/RightSidebar/useMultiNodeEdit";
import { useNodeEdit } from "../ui/Sidebar/RightSidebar/useNodeEdit";
import { Toolbar } from "../ui/Toolbar/Toolbar";
import { ZoomIndicator } from "../ui/ZoomIndicator";

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

// Same "fixed size, centered on the visible canvas" placement as
// placeFramePreset/placeUiPrimitive above — a default box big enough to
// see the image, left to the user to resize afterward rather than
// probing the image's natural dimensions before placing it.
const DEFAULT_ASSET_IMAGE_SIZE = 240;

function placeImageFromAsset(asset: Asset): void {
  const { width: canvasWidth, height: canvasHeight } = canvasSizeStore.getState();
  const sceneCenter = screenToScene({ x: canvasWidth / 2, y: canvasHeight / 2 }, viewportStore.getState());
  const graph = sceneStore.getState();

  const node: ImageNode = {
    id: generateId(),
    type: "image",
    name: nextDefaultName(graph, "Image"),
    parentId: null,
    x: sceneCenter.x - DEFAULT_ASSET_IMAGE_SIZE / 2,
    y: sceneCenter.y - DEFAULT_ASSET_IMAGE_SIZE / 2,
    width: DEFAULT_ASSET_IMAGE_SIZE,
    height: DEFAULT_ASSET_IMAGE_SIZE,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    semantics: null,
    interactions: [],
    sizingHorizontal: "fixed",
    sizingVertical: "fixed",
    positioning: "flow",
    src: asset.url,
    objectFit: "cover",
    filters: { blur: 0, brightness: 1, contrast: 1, grayscale: 0, saturate: 1, sepia: 0, hueRotate: 0 },
  };

  historyManager.execute(createAddNodeCommand(node));
  selectionStore.update((state) => ({ ...state, selectedIds: new Set([node.id]) }));
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

export function CanvasEditorPage() {
  useKeyboardShortcuts();

  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: session } = authClient.useSession();
  const theme = useTheme();

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isExportingFrame, setIsExportingFrame] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const saveStatus = useSaveStatus();

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setCurrentProjectId(projectId);
    // Guards against a slow-resolving fetch for a project the user has
    // since navigated away from (e.g. browser back/forward between two
    // /design/:id URLs, which doesn't unmount this component) overwriting
    // the new project's asset list with stale data — same race the
    // sibling effect below already guards against.
    listAssets(projectId).then((fetched) => {
      if (!cancelled) setAssets(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Loads the real project + its pages once, then swaps pagesStore's
  // placeholder page for the real ones and starts debounced autosave.
  // `cancelled` guards against a project switch (or unmount) resolving
  // this fetch after a newer one has already started.
  useEffect(() => {
    if (!projectId) return;
    const id = projectId;
    let cancelled = false;
    let teardownAutosave: (() => void) | null = null;
    let teardownEventLog: (() => void) | null = null;
    let teardownWebMcp: (() => void) | null = null;

    async function load(): Promise<void> {
      const [project, existingPages] = await Promise.all([fetchJson<Project>(`/api/projects/${id}`), listPages(id)]);
      if (cancelled) return;
      setProjectName(project.name);

      const pages = existingPages.length > 0 ? existingPages : [await createPageOnServer(id, "Page 1", EMPTY_SCENE)];
      if (cancelled) return;

      hydratePages(pages);
      teardownAutosave = initPageAutosave(id);
      teardownEventLog = initPageEventLog(id);
      teardownWebMcp = initWebMcpTools();
    }

    // A project that doesn't exist (or isn't yours — both collapse to the
    // same 404 server-side) has nothing to hydrate into; without this,
    // the rejection was silently swallowed and pagesStore's placeholder
    // page just sat there looking like a normal, if empty, project.
    load().catch(() => {
      if (!cancelled) navigate("/", { replace: true });
    });
    return () => {
      cancelled = true;
      teardownAutosave?.();
      teardownEventLog?.();
      teardownWebMcp?.();
    };
  }, [projectId, navigate]);

  async function handleUploadAsset(file: File): Promise<void> {
    if (!projectId) return;
    setIsUploadingAsset(true);
    try {
      const asset = await uploadAsset(projectId, file);
      setAssets((current) => [asset, ...(current ?? [])]);
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function handleDeleteAsset(assetId: string): Promise<void> {
    if (!projectId) return;
    await deleteAsset(projectId, assetId);
    setAssets((current) => current?.filter((asset) => asset.id !== assetId) ?? null);
  }

  // Only ever called while a Frame is the sole selection — see
  // ExportSection, which is the only thing that renders this button.
  // Component definitions aren't persisted server-side yet, so whatever
  // the frame's instance nodes need rides along from componentsStore,
  // the client's own in-memory registry.
  async function handleExportFrame(): Promise<void> {
    if (!projectId || !activePageId || !soleSelectedNode || soleSelectedNode.type !== "frame") return;
    setIsExportingFrame(true);
    try {
      const { html, fileName } = await exportFrameToHtml(
        projectId,
        activePageId,
        soleSelectedNode.id,
        componentsStore.getState().definitions,
      );
      downloadTextFile(fileName, html);
    } finally {
      setIsExportingFrame(false);
    }
  }

  const activeToolId = useActiveTool();
  const { pages, activePageId } = usePages();
  const scene = useSceneGraph();
  const { selectedIds } = useSelection();
  const documentSettings = useDocumentSettings();
  const viewport = useViewport();
  const zoomIndicatorVisible = useZoomIndicatorVisible(viewport.zoom);

  async function handleLogout(): Promise<void> {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  const selectedIdList = [...selectedIds];
  const soleSelectedId = selectedIdList.length === 1 ? selectedIdList[0] : null;
  const virtualSelection = soleSelectedId ? parseVirtualId(soleSelectedId) : null;
  const soleSelectedNode = virtualSelection
    ? resolveVirtualSelection(virtualSelection, scene)
    : soleSelectedId
      ? (scene.nodes[soleSelectedId] ?? null)
      : null;
  // Only resolved for a real (non-virtual) selection — which real node
  // stands in as a virtual instance-child's "flex parent" isn't wired up
  // in v1, see PropertiesPanelProps.parentNode's own comment.
  const soleParentNode =
    !virtualSelection && soleSelectedNode?.parentId ? (scene.nodes[soleSelectedNode.parentId] ?? null) : null;

  // A same-type multi-selection (e.g. two Text nodes) can share style
  // fields — see the PropertiesPanel doc comment for what's shown and why
  // Position isn't. uniformNode is just the first one, standing in for
  // "what type/shape of fields to render"; the actual values written come
  // from useMultiNodeEdit applying to every id in selectedIdList.
  const directSelectedNodes = selectedIdList.map((id) => scene.nodes[id]).filter((n): n is SceneNode => n !== undefined);
  const uniformNode =
    directSelectedNodes.length > 1 && directSelectedNodes.every((n) => n.type === directSelectedNodes[0].type)
      ? directSelectedNodes[0]
      : null;

  // Hooks can't be called conditionally, so all three are always
  // instantiated; whichever applies is picked below. Neither does anything
  // when handed an empty id (single/instance-child) or id list (multi/shared).
  const singleNodeEdit = useNodeEdit(!virtualSelection && soleSelectedId ? soleSelectedId : "");
  const instanceChildEdit = useInstanceOverrideEdit(virtualSelection?.instanceId ?? "", virtualSelection?.defNodeId ?? "");
  const multiNodeEdit = useMultiNodeEdit(uniformNode ? selectedIdList : []);
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
        accountName={session?.user.name ?? ""}
        accountEmail={session?.user.email ?? ""}
        accountImage={session?.user.image}
        theme={theme}
        onThemeChange={setThemePreference}
        onOpenProjects={() => navigate("/")}
        onLogout={handleLogout}
        projectName={projectName}
        zoomPercent={Math.round(viewport.zoom * 100)}
        saveStatus={saveStatus}
        assets={assets}
        isUploadingAsset={isUploadingAsset}
        onUploadAsset={handleUploadAsset}
        onDeleteAsset={handleDeleteAsset}
        onInsertAsset={placeImageFromAsset}
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
          <FlexInsertionIndicator />
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
        parentNode={soleParentNode}
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
        onExportFrame={handleExportFrame}
        isExportingFrame={isExportingFrame}
      />
    </div>
  );
}
