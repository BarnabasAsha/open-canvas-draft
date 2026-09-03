// A curated starting set, not the full ~1800-family Google Fonts catalog —
// listing every family needs their metadata API (which needs an API key we
// don't have); loading a specific family by name doesn't, since Google's
// CSS2 endpoint serves any family's @font-face rules from a plain URL. So
// "search the whole catalog" is a real future upgrade, but "load real
// Google Fonts on demand" doesn't need to wait on it.
//
// Shared between the frontend's live font loading (apps/web's
// TypographySection picker + utils/googleFonts.ts's loadGoogleFont) and the
// server-side HTML exporter (renderFrameToHtml.ts) — both need the exact
// same whitelist: the picker to offer these as options, the exporter to
// know which `fontFamily` values are real Google Fonts worth linking versus
// a generic keyword like "serif" or a system font like "Georgia".
export const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Nunito",
  "Raleway",
  "Oswald",
  "Rubik",
  "Work Sans",
  "Playfair Display",
  "Merriweather",
  "PT Sans",
  "Ubuntu",
  "Karla",
  "Fira Sans",
  "Noto Sans",
  "DM Sans",
  "Space Grotesk",
  "Manrope",
  "Quicksand",
  "Josefin Sans",
  "Libre Baskerville",
  "Bebas Neue",
  "Barlow",
  "Mulish",
] as const;

// Builds one Google Fonts CSS2 request covering every family passed in —
// the same endpoint/weight-range shape `loadGoogleFont` used to build
// inline for a single family, generalized so the HTML exporter can request
// only the families an exported frame actually uses, in one link tag.
// `null` when there's nothing to link (no Google-listed family in use).
export function buildGoogleFontsUrl(families: string[]): string | null {
  if (families.length === 0) return null;
  const query = families.map((family) => `family=${encodeURIComponent(family)}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
