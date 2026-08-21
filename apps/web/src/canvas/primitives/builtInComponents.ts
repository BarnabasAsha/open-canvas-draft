import { generateId } from "@open-canvas/commands";
import type { ComponentDefinition } from "../../store/componentsStore";
import { registerComponent } from "../../store/componentsStore";
import type { ComponentId, NodeId, SceneNode } from "@open-canvas/schema";
import { makeEllipse, makeFrame, makePath, makeRect, makeText } from "./nodeFactories";

export type UiPrimitiveKind = "button" | "input" | "checkbox" | "radio" | "toggle" | "select" | "link";

// A built-in component is a hand-authored ComponentDefinition, not a live
// selection someone grouped — there's no SceneGraph to clone from, so
// these are written directly as node trees using the same factories/shapes
// every other node uses. The whole point of this file: "Button" is just a
// Frame + Rect + Text, tagged as a component, the same way any group of
// shapes the user selects and hits Cmd+Alt+K on becomes one.
function buildDefinition(name: string, rootId: NodeId, nodes: SceneNode[]): ComponentDefinition {
  const root = nodes.find((node) => node.id === rootId)!;
  return {
    id: generateId(),
    name,
    width: root.width,
    height: root.height,
    rootId,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function buildButtonDefinition(): ComponentDefinition {
  const rootId = generateId();
  const backgroundId = generateId();
  const labelId = generateId();
  return buildDefinition("Button", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Button",
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      semantics: { tag: "button" },
      children: [backgroundId, labelId],
    }),
    makeRect({ id: backgroundId, parentId: rootId, name: "Background", x: 0, y: 0, width: 120, height: 40, fill: "#111827", cornerRadius: 6 }),
    makeText({
      id: labelId,
      parentId: rootId,
      name: "Label",
      x: 0,
      y: 11,
      width: 120,
      height: 18,
      content: "Button",
      color: "#ffffff",
      fontSize: 14,
      fontWeight: 600,
      align: "center",
    }),
  ]);
}

function buildInputDefinition(): ComponentDefinition {
  const rootId = generateId();
  const captionId = generateId();
  const boxId = generateId();
  const valueId = generateId();
  return buildDefinition("Input", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Input",
      x: 0,
      y: 0,
      width: 240,
      height: 64,
      semantics: { tag: "input" },
      children: [captionId, boxId, valueId],
    }),
    makeText({
      id: captionId,
      parentId: rootId,
      name: "Caption",
      x: 0,
      y: 0,
      width: 240,
      height: 18,
      content: "Label",
      color: "#374151",
      fontSize: 12,
      fontWeight: 500,
    }),
    makeRect({
      id: boxId,
      parentId: rootId,
      name: "Background",
      x: 0,
      y: 20,
      width: 240,
      height: 44,
      fill: "#ffffff",
      stroke: "#d1d5db",
      strokeWidth: 1,
      cornerRadius: 6,
    }),
    makeText({ id: valueId, parentId: rootId, name: "Value", x: 10, y: 34, width: 220, height: 20, content: "Placeholder", color: "#9ca3af", fontSize: 14 }),
  ]);
}

function buildCheckboxDefinition(): ComponentDefinition {
  const rootId = generateId();
  const boxId = generateId();
  const checkId = generateId();
  const labelId = generateId();
  return buildDefinition("Checkbox", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Checkbox",
      x: 0,
      y: 0,
      width: 140,
      height: 24,
      semantics: { tag: "input", role: "checkbox" },
      children: [boxId, checkId, labelId],
    }),
    makeRect({ id: boxId, parentId: rootId, name: "Box", x: 0, y: 3, width: 18, height: 18, stroke: "#9ca3af", strokeWidth: 1.5, cornerRadius: 4 }),
    // Unchecked by default — showing it is just toggling this layer's own
    // visibility (an override), the same as any other node.
    makePath({
      id: checkId,
      parentId: rootId,
      name: "Check",
      x: 0,
      y: 0,
      width: 18,
      height: 18,
      points: [
        { x: 4, y: 12 },
        { x: 7.5, y: 16 },
        { x: 14, y: 8 },
      ],
      stroke: "#111827",
      strokeWidth: 2,
      visible: false,
    }),
    makeText({ id: labelId, parentId: rootId, name: "Label", x: 26, y: 3, width: 106, height: 18, content: "Checkbox", color: "#111827", fontSize: 14 }),
  ]);
}

function buildRadioDefinition(): ComponentDefinition {
  const rootId = generateId();
  const ringId = generateId();
  const dotId = generateId();
  const labelId = generateId();
  return buildDefinition("Radio", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Radio",
      x: 0,
      y: 0,
      width: 140,
      height: 24,
      semantics: { tag: "input", role: "radio" },
      children: [ringId, dotId, labelId],
    }),
    makeEllipse({ id: ringId, parentId: rootId, name: "Ring", x: 0, y: 3, width: 18, height: 18, stroke: "#9ca3af", strokeWidth: 1.5 }),
    makeEllipse({ id: dotId, parentId: rootId, name: "Dot", x: 4.5, y: 7.5, width: 9, height: 9, fill: "#111827", visible: false }),
    makeText({ id: labelId, parentId: rootId, name: "Label", x: 26, y: 3, width: 106, height: 18, content: "Radio", color: "#111827", fontSize: 14 }),
  ]);
}

function buildToggleDefinition(): ComponentDefinition {
  const rootId = generateId();
  const trackId = generateId();
  const thumbId = generateId();
  const labelId = generateId();
  return buildDefinition("Toggle", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Toggle",
      x: 0,
      y: 0,
      width: 140,
      height: 24,
      semantics: { tag: "button", role: "switch" },
      children: [trackId, thumbId, labelId],
    }),
    makeRect({ id: trackId, parentId: rootId, name: "Track", x: 0, y: 2, width: 36, height: 20, fill: "#d1d5db", cornerRadius: 10 }),
    // "On" is a manual edit for now (move Thumb right, recolor Track) —
    // there's no bespoke checked flag driving both together anymore.
    makeEllipse({ id: thumbId, parentId: rootId, name: "Thumb", x: 2, y: 4, width: 16, height: 16, fill: "#ffffff" }),
    makeText({ id: labelId, parentId: rootId, name: "Label", x: 44, y: 2, width: 96, height: 20, content: "Toggle", color: "#111827", fontSize: 14 }),
  ]);
}

function buildSelectDefinition(): ComponentDefinition {
  const rootId = generateId();
  const captionId = generateId();
  const boxId = generateId();
  const valueId = generateId();
  const chevronId = generateId();
  return buildDefinition("Select", rootId, [
    makeFrame({
      id: rootId,
      parentId: null,
      name: "Select",
      x: 0,
      y: 0,
      width: 240,
      height: 64,
      semantics: { tag: "select" },
      children: [captionId, boxId, valueId, chevronId],
    }),
    makeText({
      id: captionId,
      parentId: rootId,
      name: "Caption",
      x: 0,
      y: 0,
      width: 240,
      height: 18,
      content: "Label",
      color: "#374151",
      fontSize: 12,
      fontWeight: 500,
    }),
    makeRect({
      id: boxId,
      parentId: rootId,
      name: "Background",
      x: 0,
      y: 20,
      width: 240,
      height: 44,
      fill: "#ffffff",
      stroke: "#d1d5db",
      strokeWidth: 1,
      cornerRadius: 6,
    }),
    makeText({
      id: valueId,
      parentId: rootId,
      name: "Value",
      x: 10,
      y: 34,
      width: 190,
      height: 20,
      content: "Select an option",
      color: "#9ca3af",
      fontSize: 14,
    }),
    // The options list itself isn't modeled — a closed dropdown's visible
    // state is just this box + value + chevron; add real rows underneath
    // by hand if you want to show one open.
    makePath({
      id: chevronId,
      parentId: rootId,
      name: "Chevron",
      x: 0,
      y: 0,
      width: 240,
      height: 64,
      points: [
        { x: 221, y: 39.5 },
        { x: 226, y: 42 },
        { x: 231, y: 39.5 },
      ],
      stroke: "#6b7280",
      strokeWidth: 1.5,
    }),
  ]);
}

function buildLinkDefinition(): ComponentDefinition {
  // A wrapping Frame even though a Link is visually one part — without one,
  // the definition's root has no children to browse into, and the top-level
  // instance selection alone can't reach a Text node's own fields (content,
  // color, decoration): none of the sections that gate on node.type apply
  // to an InstanceNode itself. The Frame carries `semantics`; Label is what
  // you actually select to restyle.
  const rootId = generateId();
  const labelId = generateId();
  return buildDefinition("Link", rootId, [
    makeFrame({ id: rootId, parentId: null, name: "Link", x: 0, y: 0, width: 100, height: 20, semantics: { tag: "a" }, children: [labelId] }),
    makeText({
      id: labelId,
      parentId: rootId,
      name: "Label",
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      content: "Link",
      color: "#2563eb",
      fontSize: 14,
      textDecoration: "underline",
    }),
  ]);
}

const BUILDERS: Record<UiPrimitiveKind, () => ComponentDefinition> = {
  button: buildButtonDefinition,
  input: buildInputDefinition,
  checkbox: buildCheckboxDefinition,
  radio: buildRadioDefinition,
  toggle: buildToggleDefinition,
  select: buildSelectDefinition,
  link: buildLinkDefinition,
};

function registerBuiltIns(): Record<UiPrimitiveKind, ComponentId> {
  const ids: Partial<Record<UiPrimitiveKind, ComponentId>> = {};
  for (const kind of Object.keys(BUILDERS) as UiPrimitiveKind[]) {
    const definition = BUILDERS[kind]();
    registerComponent(definition);
    ids[kind] = definition.id;
  }
  return ids as Record<UiPrimitiveKind, ComponentId>;
}

// Runs once, the first time this module is imported (ES modules only
// evaluate a module body once no matter how many importers there are) —
// every placed "Button" is an instance of this SAME definition, exactly
// like any other component/instance pair.
export const BUILT_IN_COMPONENT_IDS: Record<UiPrimitiveKind, ComponentId> = registerBuiltIns();
