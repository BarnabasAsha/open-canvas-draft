// A curated starting set, not the full ~1800-family Google Fonts catalog —
// listing every family needs their metadata API (which needs an API key we
// don't have); loading a specific family by name doesn't, since Google's
// CSS2 endpoint serves any family's @font-face rules from a plain URL. So
// "search the whole catalog" is a real future upgrade, but "load real
// Google Fonts on demand" doesn't need to wait on it.
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

const loadedFamilies = new Set<string>();

// Injects a <link> pulling the family's @font-face rules from Google's CSS2
// endpoint — idempotent per family per page load, since re-adding the same
// <link> would just refetch what the browser already cached anyway.
export function loadGoogleFont(family: string): void {
  if (loadedFamilies.has(family)) return;
  loadedFamilies.add(family);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
