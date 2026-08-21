type Listener = () => void;
type CacheEntry = HTMLImageElement | "loading" | "error";

const cache = new Map<string, CacheEntry>();
const listeners = new Set<Listener>();

export function getImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src);
  if (entry instanceof HTMLImageElement) return entry;
  if (entry === undefined) loadImage(src);
  return null;
}

export function subscribeImageLoad(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadImage(src: string): void {
  cache.set(src, "loading");
  const image = new Image();
  image.onload = () => {
    cache.set(src, image);
    for (const listener of listeners) listener();
  };
  image.onerror = () => {
    cache.set(src, "error");
  };
  image.src = src;
}
