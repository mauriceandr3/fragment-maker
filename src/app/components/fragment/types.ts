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

/** Which primary color the logo tracks, or 'custom' for a user-chosen color. */
export type LogoColorSource = 'custom' | 'color1' | 'color2' | 'color3' | 'color4';

export type { LogoId } from '@/lib/logoRegistry';

/** A single logo entry in the multi-logo overlay system. */
export interface LogoEntry {
  id: string;                    // unique instance id (UUID)
  logoId: import('@/lib/logoRegistry').LogoId; // which logo SVG to use
  x: number;                     // horizontal position 0–100%
  y: number;                     // vertical position 0–100%
  size: number;                  // percentage of canvas width (5–50)
  color: string;                 // hex color, e.g. '#C2A3FF'
  colorSource: LogoColorSource;  // which color the logo uses
}

/** Multi-logo overlay configuration. */
export interface LogoOverlayConfig {
  enabled: boolean;
  entries: LogoEntry[];
}

export const DEFAULT_LOGO_ENTRY: Omit<LogoEntry, 'id'> = {
  logoId: 'icp',
  x: 97,
  y: 97,
  size: 15,
  color: '#FCFCFC',
  colorSource: 'custom',
};

export const DEFAULT_LOGO_OVERLAY_CONFIG: LogoOverlayConfig = {
  enabled: false,
  entries: [],
};

/** @deprecated Use LogoOverlayConfig instead. Kept for backward compat with old presets/imports. */
export interface LogoConfig {
  enabled: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
  colorSource: LogoColorSource;
}

/** @deprecated Use DEFAULT_LOGO_OVERLAY_CONFIG instead. */
export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  enabled: false,
  x: 97,
  y: 97,
  size: 15,
  color: '#FCFCFC',
  colorSource: 'custom',
};

export const DEBOUNCE_DELAY = 100;
export const TOOLTIP_DELAY = 200;
export const TOUCH_LONG_PRESS_DELAY = 500;
