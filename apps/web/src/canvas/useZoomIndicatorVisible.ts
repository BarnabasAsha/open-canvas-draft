import { useEffect, useRef, useState } from "react";

const LINGER_MS = 1200;

// True while `zoom` is actively changing, and for a short grace period
// after the last change — not on mount, and not just because the value
// exists. Each new change resets the timer, so continuous scrolling keeps
// this true throughout the gesture and only starts the fade-out countdown
// once scrolling actually stops.
//
// Compares against the previous *value*, not a "have I run yet" flag —
// React 18 StrictMode deliberately double-invokes effects once on mount
// (dev only), and a flag-based "first run" check reads that replay as a
// second, real change, showing the indicator on load with nothing having
// zoomed at all. Comparing values is immune to that: the value is
// identical across the replay, so it's correctly seen as no change.
export function useZoomIndicatorVisible(zoom: number): boolean {
  const [visible, setVisible] = useState(false);
  const previousZoom = useRef(zoom);

  useEffect(() => {
    if (zoom === previousZoom.current) return;
    previousZoom.current = zoom;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), LINGER_MS);
    return () => clearTimeout(timer);
  }, [zoom]);

  return visible;
}
