import { type FillType } from "@/implementation-files/generateFragmentSvg";

// Re-export text-related types from generateTextGrid for easy access
export type {
  TextConfig,
  HorizontalAlignment,
  VerticalAlignment,
} from "@/implementation-files/generateTextGrid";

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

export const DEBOUNCE_DELAY = 100;
export const TOOLTIP_DELAY = 200;
export const TOUCH_LONG_PRESS_DELAY = 500;
