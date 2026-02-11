import { useState, useEffect, useMemo } from "react";
import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CELL_SIZE,
  getValidCellSizesForButtons,
  findNearestValidCellSize,
} from "@/lib/dimensionUtils";
import { parseUrlToState, updateUrlFromState, clearUrlParams, type UrlSerializableState } from "@/lib/urlState";
import { type GeneratorParams, DEBOUNCE_DELAY } from "@/app/components/fragment/types";
import type { CropDirection } from "@/lib/generateFragmentSvg";

// Parse URL params once at module load time (before any React renders)
const initialUrlState = parseUrlToState();

export function useFragmentState() {
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

  // Cropping
  const [allowCropping, setAllowCropping] = useState(initialUrlState.allowCropping ?? false);
  const [cropDirection, setCropDirection] = useState<CropDirection>(initialUrlState.cropDirection ?? 'height');

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

  const [invertColors, setInvertColors] = useState(initialUrlState.invertColors ?? false);
  const [params, setParams] = useState<GeneratorParams>({
    threshold: initialUrlState.threshold ?? 0.5,
    gamma: initialUrlState.gamma ?? 1.0,
    scale: initialUrlState.scale ?? 0.5,
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
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  // Animation preview state
  const [animationEnabled, setAnimationEnabled] = useState(initialUrlState.animationEnabled ?? false);
  const [animationSeedA, setAnimationSeedA] = useState(initialUrlState.animationSeedA ?? '');
  const [animationSeedB, setAnimationSeedB] = useState(initialUrlState.animationSeedB ?? '');

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
  const [debouncedAnimationEnabled, setDebouncedAnimationEnabled] = useState(animationEnabled);
  const [debouncedAnimationSeedA, setDebouncedAnimationSeedA] = useState(animationSeedA);
  const [debouncedAnimationSeedB, setDebouncedAnimationSeedB] = useState(animationSeedB);

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

  // Auto-generate random seeds when animation is first enabled
  useEffect(() => {
    if (animationEnabled) {
      if (!animationSeedA) setAnimationSeedA(`seed-${Math.random().toString(36).slice(2, 8)}`);
      if (!animationSeedB) setAnimationSeedB(`seed-${Math.random().toString(36).slice(2, 8)}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAnimationEnabled(animationEnabled);
      setDebouncedAnimationSeedA(animationSeedA);
      setDebouncedAnimationSeedB(animationSeedB);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [animationEnabled, animationSeedA, animationSeedB]);

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
      foregroundColor: debouncedForeground,
      backgroundColor: debouncedBackground,
      invertColors: debouncedInvertColors,
      animationEnabled: debouncedAnimationEnabled,
      animationSeedA: debouncedAnimationSeedA,
      animationSeedB: debouncedAnimationSeedB,
    };
    updateUrlFromState(state);
  }, [
    debouncedParams,
    debouncedCanvasWidth,
    debouncedCanvasHeight,
    debouncedCellSize,
    debouncedAllowCropping,
    debouncedCropDirection,
    debouncedForeground,
    debouncedBackground,
    debouncedInvertColors,
    debouncedAnimationEnabled,
    debouncedAnimationSeedA,
    debouncedAnimationSeedB,
  ]);

  // --- Derived values ---
  const gridDimensions = useMemo(() => {
    let cols: number;
    let rows: number;
    if (allowCropping) {
      if (cropDirection === 'width') {
        cols = Math.ceil(canvasWidth / cellSize);
        rows = Math.floor(canvasHeight / cellSize);
      } else {
        cols = Math.floor(canvasWidth / cellSize);
        rows = Math.ceil(canvasHeight / cellSize);
      }
    } else {
      cols = Math.floor(canvasWidth / cellSize);
      rows = Math.floor(canvasHeight / cellSize);
    }
    return { cols, rows };
  }, [canvasWidth, canvasHeight, cellSize, allowCropping, cropDirection]);

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
    invertColors, setInvertColors,
    params, setParams,
    isCollapsed, setIsCollapsed,
    viewMode, setViewMode,
    animationEnabled, setAnimationEnabled,
    animationSeedA, setAnimationSeedA,
    animationSeedB, setAnimationSeedB,
    validCellSizes,

    // Debounced values
    debounced: {
      params: debouncedParams,
      foreground: debouncedForeground,
      background: debouncedBackground,
      cellSize: debouncedCellSize,
      invertColors: debouncedInvertColors,
      canvasWidth: debouncedCanvasWidth,
      canvasHeight: debouncedCanvasHeight,
      allowCropping: debouncedAllowCropping,
      cropDirection: debouncedCropDirection,
      animationEnabled: debouncedAnimationEnabled,
      animationSeedA: debouncedAnimationSeedA,
      animationSeedB: debouncedAnimationSeedB,
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
