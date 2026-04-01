import { useState, useEffect, useMemo } from "react";
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CELL_SIZE,
  getValidCellSizesForButtons,
  findNearestValidCellSize,
} from "@/lib/dimensionUtils";
import { parseUrlToState, updateUrlFromState, clearUrlParams, type UrlSerializableState } from "@/lib/urlState";
import { type GeneratorParams, type StateType, type LogoOverlayConfig, DEFAULT_LOGO_OVERLAY_CONFIG, DEBOUNCE_DELAY, type TextOverlayConfig, DEFAULT_TEXT_OVERLAY_CONFIG } from "@/app/components/fragment/types";
import type { TextConfig } from "@/implementation-files/generateTextGrid";
import type { CropDirection, ElongateAxis, ColorMode } from "@/implementation-files/generateFragmentSvg";
import { getCellDimensions } from "@/implementation-files/generateFragmentSvg";

// Default text configuration
const DEFAULT_TEXT_CONFIG: TextConfig = {
  text: '',
  charHeight: 14,
  alignment: 'center',
  verticalAlignment: 'center',
  wordWrap: true,
  invert: false,
  fontResolution: 'mid',
};

// Parse URL params once at module load time (before any React renders)
const initialUrlState = parseUrlToState();

export function useFragmentState() {
  const [presetOrCustomMode, setPresetOrCustomMode] = useState(initialUrlState.presetOrCustomMode ?? "presets");


  // --- Core state ---
  const [foregroundColor, setForegroundColor] = useState(initialUrlState.foregroundColor ?? "#FCFCFC");
  const [backgroundColor, setBackgroundColor] = useState(initialUrlState.backgroundColor ?? "#000000");

  const [customPreset, setCustomPreset] = useState({
    background: initialUrlState.backgroundColor ?? "#000000",
    foreground: initialUrlState.foregroundColor ?? "#FCFCFC",
  });
  const [cellSize, setCellSize] = useState(initialUrlState.cellSize ?? DEFAULT_CELL_SIZE);
  const [canvasWidth, setCanvasWidth] = useState(initialUrlState.canvasWidth ?? DEFAULT_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(initialUrlState.canvasHeight ?? DEFAULT_HEIGHT);

  // Input validation state
  const [widthInputValue, setWidthInputValue] = useState<string>(String(initialUrlState.canvasWidth ?? DEFAULT_WIDTH));
  const [widthInputError, setWidthInputError] = useState<string | null>(null);
  const [heightInputValue, setHeightInputValue] = useState<string>(String(initialUrlState.canvasHeight ?? DEFAULT_HEIGHT));
  const [heightInputError, setHeightInputError] = useState<string | null>(null);
  const [durationInputValue, setDurationInputValue] = useState<string>(
    String((initialUrlState.animationDuration ?? 600) / 1000) // Display as seconds
  );
  const [durationInputError, setDurationInputError] = useState<string | null>(null);

  // Cropping
  const [allowCropping, setAllowCropping] = useState(initialUrlState.allowCropping ?? false);
  const [cropDirection, setCropDirection] = useState<CropDirection>(initialUrlState.cropDirection ?? 'height');

  // Cell elongation
  const [elongateAxis, setElongateAxis] = useState<ElongateAxis>(initialUrlState.elongateAxis ?? 'none');
  const [elongateAmount, setElongateAmount] = useState(initialUrlState.elongateAmount ?? 1);

  // Valid cell sizes based on current dimensions
  const validCellSizes = useMemo(() => {
    return getValidCellSizesForButtons(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  // Auto-select nearest valid cell size when dimensions change
  useEffect(() => {
    if (allowCropping) return;
    if (validCellSizes.length === 0) return;
    if (validCellSizes.includes(cellSize)) return;
    const nearest = findNearestValidCellSize(validCellSizes, cellSize);
    if (nearest !== null) {
      setCellSize(nearest);
    }
  }, [validCellSizes, cellSize, allowCropping]);

  // Sync string input values with underlying state when changed externally
  useEffect(() => {
    setWidthInputValue(String(canvasWidth));
    setWidthInputError(null);
  }, [canvasWidth]);

  useEffect(() => {
    setHeightInputValue(String(canvasHeight));
    setHeightInputError(null);
  }, [canvasHeight]);

  // Multi-color state
  const [colorMode, setColorMode] = useState<ColorMode>(initialUrlState.colorMode ?? 'mono');
  const [multiColors, setMultiColors] = useState<string[]>(initialUrlState.multiColors ?? ['#FCFCFC', '#C2A3FF']);
  const [colorProportions, setColorProportions] = useState<number[]>(initialUrlState.colorProportions ?? [0.5, 0.5]);
  const [textColor, setTextColor] = useState(initialUrlState.textColor ?? '#FCFCFC');

  const [invertColors, setInvertColors] = useState(initialUrlState.invertColors ?? false);
  const [params, setParams] = useState<GeneratorParams>({
    threshold: initialUrlState.threshold ?? 0.5,
    gamma: initialUrlState.gamma ?? 1.0,
    scale: initialUrlState.scale ?? (typeof window !== 'undefined' && window.innerWidth < 1920 ? 0.5 : 1),
    frequency: initialUrlState.frequency ?? 0.1,
    contrast: initialUrlState.contrast ?? 1.0,
    seed: initialUrlState.seed ?? Math.round(Math.random() * 10000) / 10000,
    directionalNeighbors: initialUrlState.directionalNeighbors ?? 8,
    directionDensity: initialUrlState.directionDensity ?? 50,
    fillAmount: initialUrlState.fillAmount ?? 50,
    fillType: initialUrlState.fillType ?? 'linear',
    invertFill: initialUrlState.invertFill ?? false,
  });

  // UI state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'chars'>('single');

  // Animation preview state
  const [animationEnabled, setAnimationEnabled] = useState(initialUrlState.animationEnabled ?? false);
  const [animationDuration, setAnimationDuration] = useState(initialUrlState.animationDuration ?? 600);
  const [showEndState, setShowEndState] = useState(initialUrlState.showEndState ?? false);

  // Sync duration input value when state changes externally
  useEffect(() => {
    setDurationInputValue(String(animationDuration / 1000));
    setDurationInputError(null);
  }, [animationDuration]);

  // "To" params for animation (null when not initialized)
  const [toParams, setToParams] = useState<GeneratorParams | null>(
    initialUrlState.toParams ? {
      ...initialUrlState.toParams,
    } : null
  );

  // State types for from/to slots ('pattern' or 'text')
  // When animation is disabled, fromStateType is used as the single state type
  const [fromStateType, setFromStateType] = useState<StateType>(initialUrlState.fromStateType ?? 'pattern');
  const [toStateType, setToStateType] = useState<StateType>(initialUrlState.toStateType ?? 'pattern');

  // Text configurations for from/to slots
  // When animation is disabled, fromTextConfig is used as the single text config
  const [fromTextConfig, setFromTextConfig] = useState<TextConfig>(
    initialUrlState.fromTextConfig ?? { ...DEFAULT_TEXT_CONFIG }
  );
  const [toTextConfig, setToTextConfig] = useState<TextConfig>(
    initialUrlState.toTextConfig ?? { ...DEFAULT_TEXT_CONFIG }
  );

  // Pattern overlay on text states
  const [fromTextPatternEnabled, setFromTextPatternEnabled] = useState(initialUrlState.fromTextPatternEnabled ?? false);
  const [fromTextPatternParams, setFromTextPatternParams] = useState<GeneratorParams>(
    initialUrlState.fromTextPatternParams ?? {
      threshold: 0.5, gamma: 1.0, scale: 1, frequency: 0.1, contrast: 1.0,
      seed: Math.round(Math.random() * 10000) / 10000,
      directionalNeighbors: 8, directionDensity: 50, fillAmount: 50,
      fillType: 'linear', invertFill: false,
    }
  );
  const [toTextPatternEnabled, setToTextPatternEnabled] = useState(initialUrlState.toTextPatternEnabled ?? false);
  const [toTextPatternParams, setToTextPatternParams] = useState<GeneratorParams>(
    initialUrlState.toTextPatternParams ?? {
      threshold: 0.5, gamma: 1.0, scale: 1, frequency: 0.1, contrast: 1.0,
      seed: Math.round(Math.random() * 10000) / 10000,
      directionalNeighbors: 8, directionDensity: 50, fillAmount: 50,
      fillType: 'linear', invertFill: false,
    }
  );

  // Logo overlay configuration
  const [logoConfig, setLogoConfig] = useState<LogoOverlayConfig>(
    initialUrlState.logoConfig ?? { ...DEFAULT_LOGO_OVERLAY_CONFIG }
  );

  // Text overlay configuration
  const [textOverlayConfig, setTextOverlayConfig] = useState<TextOverlayConfig>(
    initialUrlState.textOverlayConfig ?? { ...DEFAULT_TEXT_OVERLAY_CONFIG }
  );

  // --- Debounced state ---
  const [debouncedParams, setDebouncedParams] = useState(params);
  const [debouncedForeground, setDebouncedForeground] = useState(foregroundColor);
  const [debouncedBackground, setDebouncedBackground] = useState(backgroundColor);
  const [debouncedCellSize, setDebouncedCellSize] = useState(cellSize);
  const [debouncedInvertColors, setDebouncedInvertColors] = useState(invertColors);
  const [debouncedCanvasWidth, setDebouncedCanvasWidth] = useState(canvasWidth);
  const [debouncedCanvasHeight, setDebouncedCanvasHeight] = useState(canvasHeight);
  const [debouncedAllowCropping, setDebouncedAllowCropping] = useState(allowCropping);
  const [debouncedCropDirection, setDebouncedCropDirection] = useState(cropDirection);
  const [debouncedElongateAxis, setDebouncedElongateAxis] = useState(elongateAxis);
  const [debouncedElongateAmount, setDebouncedElongateAmount] = useState(elongateAmount);
  const [debouncedAnimationEnabled, setDebouncedAnimationEnabled] = useState(animationEnabled);
  const [debouncedAnimationDuration, setDebouncedAnimationDuration] = useState(animationDuration);
  const [debouncedToParams, setDebouncedToParams] = useState<GeneratorParams | null>(toParams);
  const [debouncedFromStateType, setDebouncedFromStateType] = useState<StateType>(fromStateType);
  const [debouncedToStateType, setDebouncedToStateType] = useState<StateType>(toStateType);
  const [debouncedFromTextConfig, setDebouncedFromTextConfig] = useState<TextConfig>(fromTextConfig);
  const [debouncedToTextConfig, setDebouncedToTextConfig] = useState<TextConfig>(toTextConfig);
  const [debouncedShowEndState, setDebouncedShowEndState] = useState(showEndState);
  const [debouncedLogoConfig, setDebouncedLogoConfig] = useState<LogoOverlayConfig>(logoConfig);
  const [debouncedPresetOrCustomMode, setDebouncedPresetOrCustomMode] = useState<'presets' | 'custom'>(presetOrCustomMode);
  const [debouncedTextOverlayConfig, setDebouncedTextOverlayConfig] = useState<TextOverlayConfig>(textOverlayConfig);
  const [debouncedColorMode, setDebouncedColorMode] = useState<ColorMode>(colorMode);
  const [debouncedMultiColors, setDebouncedMultiColors] = useState<string[]>(multiColors);
  const [debouncedColorProportions, setDebouncedColorProportions] = useState<number[]>(colorProportions);
  const [debouncedTextColor, setDebouncedTextColor] = useState(textColor);
  const [debouncedFromTextPatternEnabled, setDebouncedFromTextPatternEnabled] = useState(fromTextPatternEnabled);
  const [debouncedFromTextPatternParams, setDebouncedFromTextPatternParams] = useState<GeneratorParams>(fromTextPatternParams);
  const [debouncedToTextPatternEnabled, setDebouncedToTextPatternEnabled] = useState(toTextPatternEnabled);
  const [debouncedToTextPatternParams, setDebouncedToTextPatternParams] = useState<GeneratorParams>(toTextPatternParams);

  // Debounce effects
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedParams(params), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedForeground(foregroundColor);
      setDebouncedBackground(backgroundColor);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [foregroundColor, backgroundColor]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCellSize(cellSize), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [cellSize]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInvertColors(invertColors), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [invertColors]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCanvasWidth(canvasWidth);
      setDebouncedCanvasHeight(canvasHeight);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAllowCropping(allowCropping);
      setDebouncedCropDirection(cropDirection);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [allowCropping, cropDirection]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedElongateAxis(elongateAxis);
      setDebouncedElongateAmount(elongateAmount);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [elongateAxis, elongateAmount]);

  // Initialize toParams when animation is first enabled and no prior state exists
  useEffect(() => {
    if (animationEnabled && toParams === null) {
      // Copy from current params, but give frequency a random value
      const randomFrequency = 0.01 + Math.random() * (0.5 - 0.01);
      setToParams({
        ...params,
        frequency: Math.round(randomFrequency * 100) / 100, // round to 2 decimal places
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationEnabled]);

  // Debounce toParams
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedToParams(toParams), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [toParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAnimationEnabled(animationEnabled), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [animationEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAnimationDuration(animationDuration), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [animationDuration]);

  // Debounce state types
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromStateType(fromStateType);
      setDebouncedToStateType(toStateType);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [fromStateType, toStateType]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPresetOrCustomMode(presetOrCustomMode), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [presetOrCustomMode]);

  // Debounce text configs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromTextConfig(fromTextConfig);
      setDebouncedToTextConfig(toTextConfig);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [fromTextConfig, toTextConfig]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedShowEndState(showEndState), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [showEndState]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLogoConfig(logoConfig), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [logoConfig]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTextOverlayConfig(textOverlayConfig), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [textOverlayConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColorMode(colorMode);
      setDebouncedMultiColors(multiColors);
      setDebouncedColorProportions(colorProportions);
      setDebouncedTextColor(textColor);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [colorMode, multiColors, colorProportions, textColor]);

  // Debounce text pattern overlay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromTextPatternEnabled(fromTextPatternEnabled);
      setDebouncedFromTextPatternParams(fromTextPatternParams);
      setDebouncedToTextPatternEnabled(toTextPatternEnabled);
      setDebouncedToTextPatternParams(toTextPatternParams);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [fromTextPatternEnabled, fromTextPatternParams, toTextPatternEnabled, toTextPatternParams]);

  // --- URL sync ---
  useEffect(() => {
    const state: UrlSerializableState = {
      threshold: debouncedParams.threshold,
      gamma: debouncedParams.gamma,
      scale: debouncedParams.scale,
      frequency: debouncedParams.frequency,
      contrast: debouncedParams.contrast,
      seed: debouncedParams.seed,
      directionalNeighbors: debouncedParams.directionalNeighbors,
      directionDensity: debouncedParams.directionDensity,
      fillAmount: debouncedParams.fillAmount,
      fillType: debouncedParams.fillType,
      invertFill: debouncedParams.invertFill,
      canvasWidth: debouncedCanvasWidth,
      canvasHeight: debouncedCanvasHeight,
      cellSize: debouncedCellSize,
      allowCropping: debouncedAllowCropping,
      cropDirection: debouncedCropDirection,
      elongateAxis: debouncedElongateAxis,
      elongateAmount: debouncedElongateAmount,
      foregroundColor: debouncedForeground,
      backgroundColor: debouncedBackground,
      invertColors: debouncedInvertColors,
      colorMode: debouncedColorMode,
      multiColors: debouncedMultiColors,
      colorProportions: debouncedColorProportions,
      textColor: debouncedTextColor,
      animationEnabled: debouncedAnimationEnabled,
      animationDuration: debouncedAnimationDuration,
      toParams: debouncedToParams,
      fromStateType: debouncedFromStateType,
      toStateType: debouncedToStateType,
      fromTextConfig: debouncedFromTextConfig,
      toTextConfig: debouncedToTextConfig,
      showEndState: debouncedShowEndState,
      logoConfig: debouncedLogoConfig,
      presetOrCustomMode: debouncedPresetOrCustomMode,
      textOverlayConfig: debouncedTextOverlayConfig,
      fromTextPatternEnabled: debouncedFromTextPatternEnabled,
      fromTextPatternParams: debouncedFromTextPatternParams,
      toTextPatternEnabled: debouncedToTextPatternEnabled,
      toTextPatternParams: debouncedToTextPatternParams,
    };
    updateUrlFromState(state);
  }, [
    debouncedParams,
    debouncedCanvasWidth,
    debouncedCanvasHeight,
    debouncedCellSize,
    debouncedAllowCropping,
    debouncedCropDirection,
    debouncedElongateAxis,
    debouncedElongateAmount,
    debouncedForeground,
    debouncedBackground,
    debouncedInvertColors,
    debouncedColorMode,
    debouncedMultiColors,
    debouncedColorProportions,
    debouncedTextColor,
    debouncedAnimationEnabled,
    debouncedAnimationDuration,
    debouncedToParams,
    debouncedFromStateType,
    debouncedToStateType,
    debouncedFromTextConfig,
    debouncedToTextConfig,
    debouncedShowEndState,
    debouncedLogoConfig,
    debouncedPresetOrCustomMode,
    debouncedTextOverlayConfig,
    debouncedFromTextPatternEnabled,
    debouncedFromTextPatternParams,
    debouncedToTextPatternEnabled,
    debouncedToTextPatternParams,
  ]);

  // --- Derived values ---
  const gridDimensions = useMemo(() => {
    const { cellWidth, cellHeight } = getCellDimensions({ cellSize, elongateAxis, elongateAmount });

    // Entity-level dimensions (for pattern grids with elongation)
    let cols: number;
    let rows: number;
    if (allowCropping) {
      if (cropDirection === 'width') {
        cols = Math.ceil(canvasWidth / cellWidth);
        rows = Math.floor(canvasHeight / cellHeight);
      } else {
        cols = Math.floor(canvasWidth / cellWidth);
        rows = Math.ceil(canvasHeight / cellHeight);
      }
    } else {
      cols = Math.ceil(canvasWidth / cellWidth);
      rows = Math.ceil(canvasHeight / cellHeight);
    }

    // Base-cell-level dimensions (for text grids - text should never be stretched)
    let baseCols: number;
    let baseRows: number;
    if (allowCropping) {
      if (cropDirection === 'width') {
        baseCols = Math.ceil(canvasWidth / cellSize);
        baseRows = Math.floor(canvasHeight / cellSize);
      } else {
        baseCols = Math.floor(canvasWidth / cellSize);
        baseRows = Math.ceil(canvasHeight / cellSize);
      }
    } else {
      baseCols = Math.floor(canvasWidth / cellSize);
      baseRows = Math.floor(canvasHeight / cellSize);
    }

    return { cols, rows, cellWidth, cellHeight, baseCols, baseRows };
  }, [canvasWidth, canvasHeight, cellSize, allowCropping, cropDirection, elongateAxis, elongateAmount]);

  const displayForeground = invertColors ? backgroundColor : foregroundColor;
  const displayBackground = invertColors ? foregroundColor : backgroundColor;

  return {
    // Core state + setters
    foregroundColor, setForegroundColor,
    backgroundColor, setBackgroundColor,
    customPreset, setCustomPreset,
    cellSize, setCellSize,
    canvasWidth, setCanvasWidth,
    canvasHeight, setCanvasHeight,
    widthInputValue, setWidthInputValue,
    widthInputError, setWidthInputError,
    heightInputValue, setHeightInputValue,
    heightInputError, setHeightInputError,
    allowCropping, setAllowCropping,
    cropDirection, setCropDirection,
    elongateAxis, setElongateAxis,
    elongateAmount, setElongateAmount,
    invertColors, setInvertColors,
    colorMode, setColorMode,
    multiColors, setMultiColors,
    colorProportions, setColorProportions,
    textColor, setTextColor,
    params, setParams,
    isCollapsed, setIsCollapsed,
    viewMode, setViewMode,
    animationEnabled, setAnimationEnabled,
    animationDuration, setAnimationDuration,
    durationInputValue, setDurationInputValue,
    durationInputError, setDurationInputError,
    showEndState, setShowEndState,
    toParams, setToParams,
    validCellSizes,
    fromStateType, setFromStateType,
    toStateType, setToStateType,
    fromTextConfig, setFromTextConfig,
    toTextConfig, setToTextConfig,
    fromTextPatternEnabled, setFromTextPatternEnabled,
    fromTextPatternParams, setFromTextPatternParams,
    toTextPatternEnabled, setToTextPatternEnabled,
    toTextPatternParams, setToTextPatternParams,
    logoConfig, setLogoConfig,
    textOverlayConfig, setTextOverlayConfig,
    presetOrCustomMode, setPresetOrCustomMode,
    // Debounced values
    debounced: {
      params: debouncedParams,
      foreground: debouncedForeground,
      background: debouncedBackground,
      cellSize: debouncedCellSize,
      invertColors: debouncedInvertColors,
      colorMode: debouncedColorMode,
      multiColors: debouncedMultiColors,
      colorProportions: debouncedColorProportions,
      textColor: debouncedTextColor,
      canvasWidth: debouncedCanvasWidth,
      canvasHeight: debouncedCanvasHeight,
      allowCropping: debouncedAllowCropping,
      cropDirection: debouncedCropDirection,
      elongateAxis: debouncedElongateAxis,
      elongateAmount: debouncedElongateAmount,
      animationEnabled: debouncedAnimationEnabled,
      animationDuration: debouncedAnimationDuration,
      toParams: debouncedToParams,
      fromStateType: debouncedFromStateType,
      toStateType: debouncedToStateType,
      fromTextConfig: debouncedFromTextConfig,
      toTextConfig: debouncedToTextConfig,
      fromTextPatternEnabled: debouncedFromTextPatternEnabled,
      fromTextPatternParams: debouncedFromTextPatternParams,
      toTextPatternEnabled: debouncedToTextPatternEnabled,
      toTextPatternParams: debouncedToTextPatternParams,
      showEndState: debouncedShowEndState,
      logoConfig: debouncedLogoConfig,
      textOverlayConfig: debouncedTextOverlayConfig,
      presetOrCustomMode: debouncedPresetOrCustomMode,
    },

    // Derived
    displayForeground,
    displayBackground,
    gridDimensions,

    // Actions
    clearUrlParams,
  } as const;
}

export type FragmentState = ReturnType<typeof useFragmentState>;
