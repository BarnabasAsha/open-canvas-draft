import type { SceneGraph, TextNode } from "@open-canvas/schema";
import { applyTextFontState, wrapText } from "../renderer/shapes/wrapText";

interface Size {
  width: number;
  height: number;
}

// Detached scratch context purely for measurement, same pattern hitTest.ts
// already uses for its own throwaway 2D context — never attached to the
// DOM tree.
function createScratchContext(): CanvasRenderingContext2D {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("2d context unavailable for text measurement");
  return ctx;
}

const scratchCtx = createScratchContext();

// Keyed by node OBJECT reference, not id — under this codebase's
// immutable-update convention, a node's reference only ever changes when
// one of its own fields actually changes, so a cache hit is always safe:
// auto-width depends only on content/font fields, and auto-height depends
// additionally on the node's own (already-current) width — both fully
// captured by "this exact object was already measured." Persists across
// calls (unlike flexLayout.ts's per-resolve Map), so re-measuring an
// untouched text node during, say, an unrelated shape drag is free.
const sizeCache = new WeakMap<TextNode, Size>();

function measureTextNaturalSize(node: TextNode): Size {
  const cached = sizeCache.get(node);
  if (cached) return cached;

  applyTextFontState(scratchCtx, node);
  const lineHeightPx = node.fontSize * node.lineHeight;

  let width = node.width;
  let height = node.height;

  if (node.sizingHorizontal === "hug") {
    // Auto-width: each paragraph measured unwrapped, box = the widest one.
    // Deliberately not wrapText — that always packs to a max width, the
    // opposite of what auto-width needs.
    const paragraphs = node.content.split("\n");
    width = paragraphs.reduce((max, paragraph) => Math.max(max, scratchCtx.measureText(paragraph).width), 0);
    if (node.sizingVertical === "hug") height = paragraphs.length * lineHeightPx;
  } else if (node.sizingVertical === "hug") {
    // Auto-height: wrap at whatever width is currently stored (fixed or
    // flex-assigned "fill" — wrapText doesn't care which), hug the
    // resulting line count.
    const lines = wrapText(scratchCtx, node.content, node.width);
    height = lines.length * lineHeightPx;
  }

  const size = { width, height };
  sizeCache.set(node, size);
  return size;
}

// Called twice per graph resolve (see createSceneStore.ts's resolveGraph):
// once before resolveFlexLayout, so a hug/auto-width text node's size is
// accurate before flex reads it as a natural-size pass-through, and once
// after, so a "fill"-width + hug-height text node — whose real width is
// only known once flex has run — gets a second chance at an accurate
// height. This function itself doesn't know or care which call it's on;
// it just reacts to whatever's currently stored, which is exactly why
// calling it twice produces the right end state for free.
export function resolveTextSizing(graph: SceneGraph): SceneGraph {
  const hasHugText = Object.values(graph.nodes).some(
    (node) => node.type === "text" && (node.sizingHorizontal === "hug" || node.sizingVertical === "hug"),
  );
  if (!hasHugText) return graph;

  let nodes = graph.nodes;
  for (const node of Object.values(graph.nodes)) {
    if (node.type !== "text" || (node.sizingHorizontal !== "hug" && node.sizingVertical !== "hug")) continue;

    const measured = measureTextNaturalSize(node);
    if (measured.width === node.width && measured.height === node.height) continue;

    if (nodes === graph.nodes) nodes = { ...graph.nodes };
    nodes[node.id] = { ...node, width: measured.width, height: measured.height };
  }

  return nodes === graph.nodes ? graph : { ...graph, nodes };
}
