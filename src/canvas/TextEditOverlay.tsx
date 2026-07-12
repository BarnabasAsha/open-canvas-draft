import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { textEditStore } from "../store/textEditStore";
import { LINE_HEIGHT_MULTIPLIER } from "./renderer/shapes/drawText";
import { getScreenTransform } from "./screenTransform";
import { cancelTextEdit, commitTextEdit } from "./tools/textEdit";
import { useSceneGraph } from "./useSceneGraph";
import { useViewport } from "./useViewport";

export function TextEditOverlay() {
  const editState = useSyncExternalStore(textEditStore.subscribe, textEditStore.getState);
  const scene = useSceneGraph();
  const viewport = useViewport();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Guards against a stray native "blur" firing (e.g. from the textarea
  // unmounting) after an explicit Escape-cancel already ran — without it,
  // that stray blur would re-commit the just-cancelled value.
  const cancelledRef = useRef(false);

  const editingNodeId = editState?.nodeId ?? null;

  useEffect(() => {
    if (!editingNodeId) return;
    const node = scene.nodes[editingNodeId];
    cancelledRef.current = false;
    setValue(node && node.type === "text" ? node.content : "");

    // Deferred a frame: the click that starts an edit session is still
    // completing its native event sequence (pointerup/mouseup/click) when
    // this effect first runs, and focusing synchronously here loses a race
    // with it — the textarea would focus then immediately blur, which
    // looked like editing never started at all.
    //
    // Deliberately just focus, not select-all: that's harmless for a brand
    // new (empty) node, but for re-editing existing content via double-
    // click, select-all means the very next keystroke wipes everything —
    // surprising if you just wanted to add a word. The now-visible native
    // textarea still supports normal click-to-position-cursor / Cmd+A.
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // Only reset when a new edit session starts, not on every scene change —
    // typing updates local state only, sceneStore isn't touched until commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNodeId]);

  if (!editState) return null;
  const node = scene.nodes[editState.nodeId];
  if (!node || node.type !== "text") return null;

  const { position, rotationDegrees } = getScreenTransform(node.id, scene.nodes, viewport);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (cancelledRef.current) return;
        commitTextEdit(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelledRef.current = true;
          cancelTextEdit();
        }
      }}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: node.width * viewport.zoom,
        height: node.height * viewport.zoom,
        transform: `rotate(${rotationDegrees}deg)`,
        transformOrigin: "0 0",
        fontSize: node.fontSize * viewport.zoom,
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        color: node.color,
        textAlign: node.align,
        lineHeight: LINE_HEIGHT_MULTIPLIER,
        background: "transparent",
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
        resize: "none",
        overflow: "auto",
      }}
    />
  );
}
