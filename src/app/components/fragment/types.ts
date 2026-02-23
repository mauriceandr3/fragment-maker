import { type FillType } from "@/implementation-files/generateFragmentSvg";

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

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface LogoConfig {
  enabled: boolean;
  position: LogoPosition;
  size: number;     // percentage of canvas width (5–50)
  paddingX: number; // horizontal distance from edge (0–20%)
  paddingY: number; // vertical distance from edge (0–20%)
  color: string;    // hex color, e.g. '#C2A3FF'
}

export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  enabled: false,
  position: 'bottom-right',
  size: 15,
  paddingX: 3,
  paddingY: 3,
  color: '#FCFCFC',
};

export const DEBOUNCE_DELAY = 100;
export const TOOLTIP_DELAY = 200;
export const TOUCH_LONG_PRESS_DELAY = 500;
