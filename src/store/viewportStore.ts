import type { Viewport } from "../utils/coordinates";
import { createStore } from "./createStore";

const initialViewport: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 };

export const viewportStore = createStore<Viewport>(initialViewport);
