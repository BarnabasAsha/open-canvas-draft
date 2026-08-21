export interface FramePreset {
  name: string;
  width: number;
  height: number;
}

export interface FramePresetCategory {
  category: string;
  presets: FramePreset[];
}

// Logical/point resolutions (not raw device pixels) — the same convention
// Figma's own frame presets use, and the only one that makes sense for a
// design canvas rather than a screenshot tool. Not exhaustive; a starting
// set that's easy to extend by just adding entries.
export const FRAME_PRESET_CATEGORIES: FramePresetCategory[] = [
  {
    category: "Desktop",
    presets: [
      { name: "Desktop", width: 1440, height: 1024 },
      { name: "MacBook Pro 14″", width: 1512, height: 982 },
      { name: "MacBook Pro 16″", width: 1728, height: 1117 },
    ],
  },
  {
    category: "Tablet",
    presets: [
      { name: "iPad", width: 768, height: 1024 },
      { name: "iPad Pro 11″", width: 834, height: 1194 },
      { name: "iPad Pro 12.9″", width: 1024, height: 1366 },
    ],
  },
  {
    category: "Mobile",
    presets: [
      { name: "iPhone 12", width: 390, height: 844 },
      { name: "iPhone 14 Pro Max", width: 430, height: 932 },
      { name: "iPhone SE", width: 375, height: 667 },
    ],
  },
];
