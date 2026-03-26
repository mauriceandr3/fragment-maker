// Color alpha helpers — transparency is encoded in the color string itself (#RRGGBB or #RRGGBBAA)
export function getColorRgb(color: string): string {
  return color.slice(0, 7);
}

export function getColorAlpha(color: string): number {
  if (color.length === 9) {
    return parseInt(color.slice(7, 9), 16) / 255;
  }
  return 1;
}

export function isTransparent(color: string): boolean {
  return getColorAlpha(color) === 0;
}

export function setColorAlpha(color: string, alpha: number): string {
  const rgb = getColorRgb(color);
  if (alpha >= 1) return rgb;
  const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return rgb + hex;
}

export const COLOR_PRESETS = [
  { name: "Horizon White", background: "#000000", foreground: "#FCFCFC" },
  { name: "Signal Cyan", background: "#000000", foreground: "#00F9E1" },
  { name: "Neural Magenta", background: "#000000", foreground: "#FF00F7" },
  { name: "Path Lilac", background: "#000000", foreground: "#C2A3FF" },
  { name: "Source Blue", background: "#000000", foreground: "#BBE9FF" },
  { name: "Reason Green", background: "#000000", foreground: "#6CFF80" },
  { name: "Genesis Blue", background: "#000000", foreground: "#000DFB" },
];

export interface MultiColorPreset {
  name: string;
  background: string;
  colors: string[];
  proportions: number[];
}

export const DUO_COLOR_PRESETS: MultiColorPreset[] = [
  { name: "Frost & Lilac", background: "#000000", colors: ["#FCFCFC", "#C2A3FF"], proportions: [0.5, 0.5] },
  { name: "Cyan & Magenta", background: "#000000", colors: ["#00F9E1", "#FF00F7"], proportions: [0.5, 0.5] },
  { name: "White & Blue", background: "#0A0A2E", colors: ["#FCFCFC", "#4466FF"], proportions: [0.6, 0.4] },
  { name: "Ice & Coral", background: "#000000", colors: ["#BBE9FF", "#FF6B6B"], proportions: [0.5, 0.5] },
  { name: "Lime & Violet", background: "#000000", colors: ["#6CFF80", "#8B5CF6"], proportions: [0.5, 0.5] },
  { name: "Gold & Navy", background: "#0A0A1A", colors: ["#FFD700", "#1E40AF"], proportions: [0.4, 0.6] },
];

export const TRI_COLOR_PRESETS: MultiColorPreset[] = [
  { name: "ICP Classic", background: "#0E0030", colors: ["#FCFCFC", "#6366F1", "#E2FF00"], proportions: [0.4, 0.4, 0.2] },
  { name: "Neon Trinity", background: "#000000", colors: ["#00F9E1", "#FF00F7", "#FCFCFC"], proportions: [0.33, 0.34, 0.33] },
  { name: "Sunset Fade", background: "#0A0A1A", colors: ["#FF6B6B", "#FFD93D", "#6BCB77"], proportions: [0.33, 0.34, 0.33] },
  { name: "Arctic Glow", background: "#000000", colors: ["#BBE9FF", "#C2A3FF", "#FCFCFC"], proportions: [0.3, 0.3, 0.4] },
  { name: "Cyber Punk", background: "#0A0A0A", colors: ["#FF00F7", "#00F9E1", "#FFD700"], proportions: [0.4, 0.3, 0.3] },
  { name: "Deep Ocean", background: "#000011", colors: ["#4466FF", "#00F9E1", "#FCFCFC"], proportions: [0.4, 0.35, 0.25] },
];
