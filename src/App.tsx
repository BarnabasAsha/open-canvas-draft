import { Canvas } from "./canvas/Canvas";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./canvas/canvasSize";
import { SelectionOverlay } from "./canvas/SelectionOverlay";
import { useKeyboardShortcuts } from "./canvas/useKeyboardShortcuts";

export default function App() {
  useKeyboardShortcuts();

  return (
    <div style={{ position: "relative", width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <Canvas />
      <SelectionOverlay />
    </div>
  );
}
