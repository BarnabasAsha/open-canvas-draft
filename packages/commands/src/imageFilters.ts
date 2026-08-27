import type { ImageFilters } from "@open-canvas/schema";

// Neutral = every filter is a no-op, the default for a brand-new image.
// Shared by the renderer (skip setting ctx.filter at all) and the CSS
// inspector (omit the `filter` line entirely) so both agree on exactly
// the same threshold.
export function isNeutralFilters(filters: ImageFilters): boolean {
  return (
    filters.blur === 0 &&
    filters.brightness === 1 &&
    filters.contrast === 1 &&
    filters.grayscale === 0 &&
    filters.saturate === 1 &&
    filters.sepia === 0 &&
    filters.hueRotate === 0
  );
}

// Values are already stored in the units each CSS filter function
// expects (see ImageFiltersSchema) — this is pure formatting, no
// conversion. Used identically by drawImage.ts (as ctx.filter) and
// generateNodeCss.ts (as the `filter` CSS property), so the canvas
// preview and the generated CSS can never disagree.
export function buildCssFilterString(filters: ImageFilters): string {
  if (isNeutralFilters(filters)) return "none";

  const parts: string[] = [];
  if (filters.blur !== 0) parts.push(`blur(${filters.blur}px)`);
  if (filters.brightness !== 1) parts.push(`brightness(${filters.brightness})`);
  if (filters.contrast !== 1) parts.push(`contrast(${filters.contrast})`);
  if (filters.grayscale !== 0) parts.push(`grayscale(${filters.grayscale})`);
  if (filters.saturate !== 1) parts.push(`saturate(${filters.saturate})`);
  if (filters.sepia !== 0) parts.push(`sepia(${filters.sepia})`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  return parts.join(" ");
}
