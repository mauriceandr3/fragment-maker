import { type FillType, type ElongateAxis } from "@/implementation-files/generateFragmentSvg";

export type { ElongateAxis };

export type {
  TextOverlayEntry,
  TextOverlayConfig,
  TextOverlayAlignment,
  TextOverlayZOrder,
  TextOverlayFontWeight,
  TextOverlayPathData,
} from "@/implementation-files/textOverlay";
export {
  DEFAULT_TEXT_OVERLAY_CONFIG,
  DEFAULT_TEXT_OVERLAY_ENTRY,
} from "@/implementation-files/textOverlay";

// Re-export text-related types from generateTextGrid for easy access
export type {
  TextConfig,
  HorizontalAlignment,
  VerticalAlignment,
  FontResolution,
} from "@/implementation-files/generateTextGrid";
export { RESOLUTION_MIN_HEIGHT } from "@/implementation-files/generateTextGrid";

/**
 * State type for animation slots.
 * Each slot (from/to in animated mode, or single in non-animated mode)
 * can be either a pattern or text.
 */
export type StateType = 'pattern' | 'text';

export interface GeneratorParams {
  threshold: number;
  gamma: number;
  scale: number;
  frequency: number;
  contrast: number;
  seed: number;
  directionalNeighbors: number;
  directionDensity: number;
  fillAmount: number;
  fillType: FillType;
  invertFill: boolean;
}

export interface LogoConfig {
  enabled: boolean;
  x: number;        // horizontal position 0–100% (0 = left edge, 100 = right edge)
  y: number;        // vertical position 0–100% (0 = top edge, 100 = bottom edge)
  size: number;     // percentage of canvas width (5–50)
  color: string;    // hex color, e.g. '#C2A3FF'
  useForeground: boolean; // when true, logo color tracks the foreground color
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  enabled: false,
  x: 97,
  y: 97,
  size: 15,
  color: '#FCFCFC',
  useForeground: false,
};

export const DEBOUNCE_DELAY = 100;
export const TOOLTIP_DELAY = 200;
export const TOUCH_LONG_PRESS_DELAY = 500;
