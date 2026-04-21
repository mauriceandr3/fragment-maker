import type { GeneratorParams, StateType, LogoOverlayConfig, TextOverlayConfig, ImageOverlayConfig } from './types';
import type { TextConfig } from '@/implementation-files/generateTextGrid';
import type { CropDirection, ElongateAxis, ColorMode } from '@/implementation-files/generateFragmentSvg';
import type { LockableParamField } from './ParametersPanel';
import type { LockableColorField } from './ColorsPanel';

/**
 * Configuration for which parts of the UI the user can customize within a preset.
 * Omitted/false = locked (hidden). true = unlocked (visible).
 * For params, provide an array of field keys to lock; unlisted fields are editable.
 */
export interface PresetCustomization {
    /** Show the full canvas settings panel */
    canvas?: boolean;
    /** Show the full colors panel */
    colors?: boolean;
    /** Show the full logo panel */
    logo?: boolean;
    /** When true (with logo: true), only show the logo color picker (no position, size, or custom color). */
    logoColorOnly?: boolean;
    /** Show the full animation panel */
    animation?: boolean;
    /** Show the from/to parameter panels. When true, all fields are unlocked. */
    parameters?: boolean;
    /**
     * Lock specific parameter fields within the from/to panels.
     * Only relevant when `parameters` is true.
     * Listed fields are hidden; unlisted fields remain editable.
     */
    lockedParams?: LockableParamField[];
    /**
     * Lock specific color fields within the colors panel.
     * Only relevant when `colors` is true.
     * Listed fields are hidden; unlisted fields remain editable.
     */
    lockedColors?: LockableColorField[];
    /** When true, the Pattern/Text state type toggle is locked (hidden). Default: true (locked). */
    stateTypeLocked?: boolean;
    /** Show the text overlay panel (preset mode only). */
    textOverlay?: boolean;
    /** Show the image overlay panel (preset mode only). */
    image?: boolean;
}

/** Full editability for presets saved from the current design (Custom or tweaked built-ins). */
export const USER_SAVED_PRESET_CUSTOMIZATION: PresetCustomization = {
    canvas: true,
    colors: true,
    logo: true,
    textOverlay: true,
    image: true,
    animation: true,
    parameters: true,
    stateTypeLocked: false,
};

export interface PresetConfig {
    label: string;
    value: string;
    /** What the user can customize. */
    customization: PresetCustomization;
    // Canvas
    canvasWidth: number;
    canvasHeight: number;
    cellSize: number;
    allowCropping: boolean;
    cropDirection: CropDirection;
    elongateAxis?: ElongateAxis;
    elongateAmount?: number;
    // Colors
    foregroundColor: string;
    backgroundColor: string;
    invertColors: boolean;
    colorMode?: ColorMode;
    multiColors?: string[];
    colorProportions?: number[];
    /** Text / bitmap grid color when in text mode (defaults to foreground in applyPreset if omitted). */
    textColor?: string;
    /** Vector text overlay (blog titles, bylines, etc.). */
    textOverlayConfig?: TextOverlayConfig;
    /** Linked raster image on the canvas (same-origin URL or data URL). */
    imageOverlayConfig?: ImageOverlayConfig;
    // Animation
    animationEnabled: boolean;
    animationDuration: number;
    // Logo
    logoConfig: LogoOverlayConfig;
    // From state
    fromStateType: StateType;
    params: GeneratorParams;
    fromTextConfig: TextConfig;
    // To state (for animation)
    toStateType: StateType;
    toParams: GeneratorParams | null;
    toTextConfig: TextConfig;
}
