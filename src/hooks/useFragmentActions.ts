import React from "react";
import { type FillType } from "@/lib/generateFragmentSvg";
import { getColorRgb } from "@/lib/colorUtils";
import {
  MIN_CANVAS_DIMENSION,
  MAX_CANVAS_DIMENSION,
  MAX_CELL_SIZE,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CELL_SIZE,
  getDynamicMinCellSize,
  getValidCellSizesForButtons,
  findNearestValidCellSize,
} from "@/lib/dimensionUtils";
import type { FragmentState } from "./useFragmentState";
import type { FragmentGeneration } from "./useFragmentGeneration";

export function useFragmentActions(state: FragmentState, generation: FragmentGeneration) {
  const {
    setForegroundColor, setBackgroundColor, setCustomPreset,
    setCellSize, setCanvasWidth, setCanvasHeight,
    setWidthInputError, setHeightInputError,
    setAllowCropping, setCropDirection, setInvertColors,
    setParams,
    setAnimationEnabled,
    setToParams,
    clearUrlParams,
    foregroundColor, backgroundColor, cellSize,
    canvasWidth, canvasHeight, allowCropping, cropDirection,
    params,
  } = state;

  const { generateSVG } = generation;

  const randomizeParams = () => {
    setParams({
      threshold: Math.round(Math.random() * 100) / 100,
      gamma: Math.round((0.5 + Math.random() * 2.5) * 10) / 10,
      scale: 1.0,
      frequency: Math.round((0.05 + Math.random() * 0.3) * 100) / 100,
      contrast: Math.round((0.5 + Math.random() * 2) * 10) / 10,
      seed: Math.round(Math.random() * 10000) / 10000,
      directionalNeighbors: Math.floor(Math.random() * 89),
      directionDensity: Math.floor(20 + Math.random() * 80),
      fillAmount: Math.floor(10 + Math.random() * 80),
      fillType: 'linear',
      invertFill: Math.random() > 0.5,
    });
  };

  const resetToDefaults = () => {
    setForegroundColor("#FCFCFC");
    setBackgroundColor("#000000");
    setCustomPreset({ background: "#000000", foreground: "#FCFCFC" });
    setCanvasWidth(DEFAULT_WIDTH);
    setCanvasHeight(DEFAULT_HEIGHT);
    setCellSize(DEFAULT_CELL_SIZE);
    setInvertColors(false);
    setWidthInputError(null);
    setHeightInputError(null);
    setParams({
      threshold: 0.5,
      gamma: 1.0,
      scale: 0.5,
      frequency: 0.1,
      contrast: 1.0,
      seed: Math.round(Math.random() * 10000) / 10000,
      directionalNeighbors: 8,
      directionDensity: 50,
      fillAmount: 50,
      fillType: 'linear',
      invertFill: false,
    });
    setAnimationEnabled(false);
    setToParams(null);
    clearUrlParams();
  };

  const exportToSVG = () => {
    const svg = generateSVG();
    if (!svg) return;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'asset.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const svg = generateSVG();
    if (!svg) return;

    try {
      await navigator.clipboard.writeText(svg);
      alert('SVG copied to clipboard! Paste in Figma to import.');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = svg;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('SVG copied to clipboard! Paste in Figma to import.');
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
        alert('Failed to copy to clipboard. Please use the Download button instead.');
      }
    }
  };

  const exportSettingsAsJson = () => {
    const { animationEnabled, toParams } = state;

    const exportData: {
      version: string;
      exportedAt: string;
      config: {
        threshold: number;
        gamma: number;
        frequency: number;
        contrast: number;
        seed: number;
        directionalNeighbors: number;
        directionDensity: number;
        fillAmount: number;
        fillType: FillType;
        invertFill: boolean;
        foregroundColor: string;
        backgroundColor: string;
        cellSize: number;
        canvasWidth: number;
        canvasHeight: number;
        allowCropping: boolean;
        cropDirection?: 'width' | 'height';
      };
      toConfig?: {
        threshold: number;
        gamma: number;
        frequency: number;
        contrast: number;
        seed: number;
        directionalNeighbors: number;
        directionDensity: number;
        fillAmount: number;
        fillType: FillType;
        invertFill: boolean;
        foregroundColor: string;
        backgroundColor: string;
        cellSize: number;
        canvasWidth: number;
        canvasHeight: number;
        allowCropping: boolean;
        cropDirection?: 'width' | 'height';
      };
    } = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      config: {
        threshold: params.threshold,
        gamma: params.gamma,
        frequency: params.frequency,
        contrast: params.contrast,
        seed: params.seed,
        directionalNeighbors: params.directionalNeighbors,
        directionDensity: params.directionDensity,
        fillAmount: params.fillAmount,
        fillType: params.fillType,
        invertFill: params.invertFill,
        foregroundColor,
        backgroundColor,
        cellSize,
        canvasWidth,
        canvasHeight,
        allowCropping,
        ...(allowCropping ? { cropDirection } : {}),
      },
      // Include toConfig when animation is enabled (presence implies animation enabled)
      ...(animationEnabled && toParams ? {
        toConfig: {
          threshold: toParams.threshold,
          gamma: toParams.gamma,
          frequency: toParams.frequency,
          contrast: toParams.contrast,
          seed: toParams.seed,
          directionalNeighbors: toParams.directionalNeighbors,
          directionDensity: toParams.directionDensity,
          fillAmount: toParams.fillAmount,
          fillType: toParams.fillType,
          invertFill: toParams.invertFill,
          // Shared settings (included for type consistency)
          foregroundColor,
          backgroundColor,
          cellSize,
          canvasWidth,
          canvasHeight,
          allowCropping,
          ...(allowCropping ? { cropDirection } : {}),
        },
      } : {}),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fragment-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettingsFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          alert('Failed to read file.');
          return;
        }

        const data = JSON.parse(text);

        if (!data || typeof data !== 'object' || !data.version || typeof data.version !== 'string') {
          alert('Invalid settings file: missing version field.');
          return;
        }

        if (!data.version.startsWith('2.')) {
          alert(`Unsupported settings version: ${data.version}. Expected version 2.x.x.`);
          return;
        }

        const config = data.config;
        if (!config || typeof config !== 'object') {
          alert('Invalid settings file: missing config object.');
          return;
        }

        const clamp = (val: unknown, min: number, max: number, fallback: number): number => {
          const n = Number(val);
          if (isNaN(n) || !isFinite(n)) return fallback;
          return Math.max(min, Math.min(max, n));
        };

        const hexRegex = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
        const validFillTypes: FillType[] = ['linear', 'radial', 'angular', 'diamond', 'square', 'box'];

        const newWidth = Math.round(clamp(config.canvasWidth, MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION, DEFAULT_WIDTH));
        const newHeight = Math.round(clamp(config.canvasHeight, MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION, DEFAULT_HEIGHT));

        const newForeground = typeof config.foregroundColor === 'string' && hexRegex.test(config.foregroundColor)
          ? config.foregroundColor : '#FCFCFC';
        const newBackground = typeof config.backgroundColor === 'string' && hexRegex.test(config.backgroundColor)
          ? config.backgroundColor : '#000000';

        const newAllowCropping = typeof config.allowCropping === 'boolean' ? config.allowCropping : false;
        const newCropDirection: 'width' | 'height' = config.cropDirection === 'width' ? 'width' : 'height';

        const dynamicMin = getDynamicMinCellSize(newWidth, newHeight);
        let newCellSize = Math.round(clamp(config.cellSize, dynamicMin, MAX_CELL_SIZE, DEFAULT_CELL_SIZE));

        let finalAllowCropping = newAllowCropping;
        if (!finalAllowCropping) {
          const validSizes = getValidCellSizesForButtons(newWidth, newHeight);
          if (!validSizes.includes(newCellSize)) {
            const nearest = findNearestValidCellSize(validSizes, newCellSize);
            if (nearest !== null) {
              newCellSize = nearest;
            } else {
              finalAllowCropping = true;
            }
          }
        }

        setCanvasWidth(newWidth);
        setCanvasHeight(newHeight);
        setCellSize(newCellSize);
        setAllowCropping(finalAllowCropping);
        setCropDirection(newCropDirection);
        setForegroundColor(newForeground);
        setBackgroundColor(newBackground);
        setCustomPreset({ background: getColorRgb(newBackground), foreground: getColorRgb(newForeground) });

        setParams((prev) => ({
          ...prev,
          threshold: clamp(config.threshold, 0, 1, 0.5),
          gamma: clamp(config.gamma, 0.1, 3, 1.0),
          frequency: clamp(config.frequency, 0.01, 0.5, 0.1),
          contrast: clamp(config.contrast, 0.1, 3, 1.0),
          seed: clamp(config.seed, 0, 1, Math.round(Math.random() * 10000) / 10000),
          directionalNeighbors: Math.floor(clamp(config.directionalNeighbors, 0, 999, 8)),
          directionDensity: Math.floor(clamp(config.directionDensity, 0, 999, 50)),
          fillAmount: Math.floor(clamp(config.fillAmount, 0, 100, 50)),
          fillType: validFillTypes.includes(config.fillType) ? config.fillType : 'linear',
          invertFill: typeof config.invertFill === 'boolean' ? config.invertFill : false,
        }));

        // Handle toConfig (new format) - presence implies animation enabled
        if (data.toConfig && typeof data.toConfig === 'object') {
          setAnimationEnabled(true);
          setToParams({
            threshold: clamp(data.toConfig.threshold, 0, 1, 0.5),
            gamma: clamp(data.toConfig.gamma, 0.1, 3, 1.0),
            scale: 0.5, // toConfig doesn't have scale, use default
            frequency: clamp(data.toConfig.frequency, 0.01, 0.5, 0.1),
            contrast: clamp(data.toConfig.contrast, 0.1, 3, 1.0),
            seed: clamp(data.toConfig.seed, 0, 1, Math.round(Math.random() * 10000) / 10000),
            directionalNeighbors: Math.floor(clamp(data.toConfig.directionalNeighbors, 0, 999, 8)),
            directionDensity: Math.floor(clamp(data.toConfig.directionDensity, 0, 999, 50)),
            fillAmount: Math.floor(clamp(data.toConfig.fillAmount, 0, 100, 50)),
            fillType: validFillTypes.includes(data.toConfig.fillType) ? data.toConfig.fillType : 'linear',
            invertFill: typeof data.toConfig.invertFill === 'boolean' ? data.toConfig.invertFill : false,
          });
        } else {
          // No toConfig = animation disabled
          setAnimationEnabled(false);
          // Note: Legacy animationSeedA/animationSeedB fields are ignored gracefully
        }

      } catch {
        alert('Failed to parse settings file. Please ensure it is valid JSON.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return {
    randomizeParams,
    resetToDefaults,
    exportToSVG,
    copyToClipboard,
    exportSettingsAsJson,
    importSettingsFromJson,
  } as const;
}

export type FragmentActions = ReturnType<typeof useFragmentActions>;
