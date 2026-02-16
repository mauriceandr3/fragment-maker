import { type FillType } from "@/implementation-files/generateFragmentSvg";

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
