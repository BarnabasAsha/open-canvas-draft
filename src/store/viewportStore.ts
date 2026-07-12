import type { Viewport } from "../utils/coordinates";
import { createStore } from "./createStore";

export const INITIAL_VIEWPORT: Viewport = { pan: { x: 0, y: 0 }, zoom: 1 };

export const viewportStore = createStore<Viewport>(INITIAL_VIEWPORT);
