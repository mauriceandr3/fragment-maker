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
