import { buildGoogleFontsUrl } from "@open-canvas/commands";

export { GOOGLE_FONTS } from "@open-canvas/commands";

const loadedFamilies = new Set<string>();

// Injects a <link> pulling the family's @font-face rules from Google's CSS2
// endpoint — idempotent per family per page load, since re-adding the same
// <link> would just refetch what the browser already cached anyway.
export function loadGoogleFont(family: string): void {
  if (loadedFamilies.has(family)) return;
  loadedFamilies.add(family);

  const href = buildGoogleFontsUrl([family]);
  if (!href) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
