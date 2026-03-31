import React from "react";
import { type FillType, type ElongateAxis } from "@/implementation-files/generateFragmentSvg";
import { DEFAULT_LOGO_CONFIG, DEFAULT_TEXT_OVERLAY_CONFIG } from "@/app/components/fragment/types";
import { isValidFontWeight, type TextOverlayConfig, type TextOverlayEntry } from "@/implementation-files/textOverlay";
import { vectorizeAllEntries } from "@/lib/textVectorizer";
import { serializeFonts, type FontData, type FontResolution } from "@/implementation-files/generateTextGrid";
import { FONTS } from "@/lib/bitmapFonts";
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
    setAllowCropping, setCropDirection,
    setElongateAxis, setElongateAmount,
    setInvertColors,
    setColorMode, setMultiColors, setColorProportions, setTextColor,
    setParams,
    setAnimationEnabled,
    setAnimationDuration,
    setToParams,
    setFromStateType, setToStateType,
    setFromTextConfig, setToTextConfig,
    clearUrlParams,
    foregroundColor, backgroundColor, cellSize,
    canvasWidth, canvasHeight, allowCropping, cropDirection,
    elongateAxis, elongateAmount,
    colorMode, multiColors, colorProportions, textColor,
    params,
  } = state;

  const { generateSVG } = generation;

  const generateRandomParams = () => ({
    threshold: Math.round(Math.random() * 100) / 100,
    gamma: Math.round((0.5 + Math.random() * 2.5) * 10) / 10,
    scale: 1.0,
    frequency: Math.round((0.05 + Math.random() * 0.3) * 100) / 100,
    contrast: Math.round((0.5 + Math.random() * 2) * 10) / 10,
    seed: Math.round(Math.random() * 10000) / 10000,
    directionalNeighbors: Math.floor(Math.random() * 89),
    directionDensity: Math.floor(20 + Math.random() * 80),
    fillAmount: Math.floor(10 + Math.random() * 80),
    fillType: 'linear' as const,
    invertFill: Math.random() > 0.5,
  });

  const randomizeParams = () => {
    setParams(generateRandomParams());
  };

  const randomizeToParams = () => {
    setToParams(generateRandomParams());
  };

  const randomizeFromTextPatternParams = () => {
    state.setFromTextPatternParams(generateRandomParams());
  };
  const randomizeToTextPatternParams = () => {
    state.setToTextPatternParams(generateRandomParams());
  };

  const swapFromTo = () => {
    const currentToParams = state.toParams;
    if (!currentToParams) return;

    const currentParams = state.params;
    const currentFromStateType = state.fromStateType;
    const currentToStateType = state.toStateType;
    const currentFromTextConfig = state.fromTextConfig;
    const currentToTextConfig = state.toTextConfig;

    setParams(currentToParams);
    setToParams(currentParams);
    setFromStateType(currentToStateType);
    setToStateType(currentFromStateType);
    setFromTextConfig(currentToTextConfig);
    setToTextConfig(currentFromTextConfig);

    const currentFromTpe = state.fromTextPatternEnabled;
    const currentToTpe = state.toTextPatternEnabled;
    const currentFromTpp = state.fromTextPatternParams;
    const currentToTpp = state.toTextPatternParams;
    state.setFromTextPatternEnabled(currentToTpe);
    state.setToTextPatternEnabled(currentFromTpe);
    state.setFromTextPatternParams(currentToTpp);
    state.setToTextPatternParams(currentFromTpp);
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
      scale: 1,
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
    setAnimationDuration(600);
    setToParams(null);
    state.setFromTextPatternEnabled(false);
    state.setToTextPatternEnabled(false);
    state.setShowEndState(false);
    state.setLogoConfig({ ...DEFAULT_LOGO_CONFIG });
    state.setTextOverlayConfig({ ...DEFAULT_TEXT_OVERLAY_CONFIG });
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

  const exportSettingsAsJson = async () => {
    const { animationEnabled, toParams, fromStateType, toStateType, fromTextConfig, toTextConfig, fromTextPatternEnabled, fromTextPatternParams, toTextPatternEnabled, toTextPatternParams } = state;

    const buildPatternOverlayConfig = (p: typeof fromTextPatternParams) => ({
      threshold: p.threshold,
      gamma: p.gamma,
      scale: p.scale,
      frequency: p.frequency,
      contrast: p.contrast,
      seed: p.seed,
      directionalNeighbors: p.directionalNeighbors,
      directionDensity: p.directionDensity,
      fillAmount: p.fillAmount,
      fillType: p.fillType,
      invertFill: p.invertFill,
    });

    // Build the export data object
    // State type fields only included when value is 'text' (absent = 'pattern' for backward compat)
    // Text config fields only included when respective state type is 'text'
    const exportData: Record<string, unknown> = {
      version: '2.6.0',
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
        ...(elongateAxis !== 'none' ? { elongateAxis, elongateAmount } : {}),
        ...(colorMode !== 'mono' ? { colorMode, colors: multiColors, colorProportions, textColor } : {}),
      },
    };

    // Add animation settings when enabled
    if (animationEnabled) {
      exportData.animation = {
        duration: state.animationDuration,
      };
    }

    // Include toConfig when animation is enabled (presence implies animation enabled)
    if (animationEnabled && toParams) {
      exportData.toConfig = {
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
        ...(elongateAxis !== 'none' ? { elongateAxis, elongateAmount } : {}),
        ...(colorMode !== 'mono' ? { colorMode, colors: multiColors, colorProportions, textColor } : {}),
      };
    }

    // Include full font data when any state uses text (enables consumers to
    // change text, charHeight, etc. without needing a separate font file)
    if (fromStateType === 'text' || toStateType === 'text') {
      exportData.fonts = serializeFonts(FONTS as FontData);
    }

    // Add fromStateType only when it's 'text' (absent defaults to 'pattern')
    if (fromStateType === 'text') {
      exportData.fromStateType = 'text';
      exportData.fromTextConfig = {
        text: fromTextConfig.text,
        charHeight: fromTextConfig.charHeight,
        alignment: fromTextConfig.alignment,
        verticalAlignment: fromTextConfig.verticalAlignment,
        wordWrap: fromTextConfig.wordWrap,
        invert: fromTextConfig.invert,
        fontResolution: fromTextConfig.fontResolution,
      };
      if (fromTextPatternEnabled) {
        exportData.fromTextPatternConfig = buildPatternOverlayConfig(fromTextPatternParams);
      }
    }

    // Add toStateType only when it's 'text' (absent defaults to 'pattern')
    if (toStateType === 'text') {
      exportData.toStateType = 'text';
      exportData.toTextConfig = {
        text: toTextConfig.text,
        charHeight: toTextConfig.charHeight,
        alignment: toTextConfig.alignment,
        verticalAlignment: toTextConfig.verticalAlignment,
        wordWrap: toTextConfig.wordWrap,
        invert: toTextConfig.invert,
        fontResolution: toTextConfig.fontResolution,
      };
      if (toTextPatternEnabled) {
        exportData.toTextPatternConfig = buildPatternOverlayConfig(toTextPatternParams);
      }
    }

    // Include logo config when enabled (absent = logo disabled for backward compat)
    if (state.logoConfig.enabled) {
      exportData.logo = {
        enabled: true,
        x: state.logoConfig.x,
        y: state.logoConfig.y,
        size: state.logoConfig.size,
        color: state.logoConfig.color,
        useForeground: state.logoConfig.useForeground,
      };
    }

    // Include text overlay config when enabled (v2.4.0+)
    // Vectorize entries so the exported JSON contains pre-computed SVG paths
    if (state.textOverlayConfig.enabled && state.textOverlayConfig.entries.length > 0) {
      const vectorized = await vectorizeAllEntries(
        state.textOverlayConfig,
        canvasWidth,
        canvasHeight,
      );
      exportData.textOverlay = {
        enabled: true,
        entries: vectorized.entries.map(e => ({
          id: e.id,
          content: e.content,
          y: e.y,
          fontSize: e.fontSize,
          fontWeight: e.fontWeight,
          alignment: e.alignment,
          color: e.color,
          lineHeight: e.lineHeight,
          sidePadding: e.sidePadding,
          zOrder: e.zOrder,
          paths: e.paths,
        })),
      };
    }

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

        // Elongation
        const validAxes: ElongateAxis[] = ['none', 'width', 'height'];
        const newElongateAxis: ElongateAxis = validAxes.includes(config.elongateAxis) ? config.elongateAxis : 'none';
        const newElongateAmount = newElongateAxis !== 'none'
          ? Math.round(clamp(config.elongateAmount, 2, 16, 2))
          : 1;
        setElongateAxis(newElongateAxis);
        setElongateAmount(newElongateAmount);

        setForegroundColor(newForeground);
        setBackgroundColor(newBackground);
        setCustomPreset({ background: getColorRgb(newBackground), foreground: getColorRgb(newForeground) });

        // Multi-color
        const validColorModes = ['mono', 'duo', 'tri'] as const;
        const newColorMode = validColorModes.includes(config.colorMode) ? config.colorMode : 'mono';
        setColorMode(newColorMode);
        if (newColorMode !== 'mono' && Array.isArray(config.colors)) {
          const validColors = config.colors.filter((c: unknown) => typeof c === 'string' && hexRegex.test(c as string));
          if (validColors.length >= 2) setMultiColors(validColors);
          if (Array.isArray(config.colorProportions)) {
            const props = config.colorProportions.filter((p: unknown) => typeof p === 'number' && !isNaN(p as number));
            if (props.length >= 2) {
              const total = props.reduce((a: number, b: number) => a + b, 0);
              setColorProportions(props.map((p: number) => p / total));
            }
          }
          // Text color
          if (typeof config.textColor === 'string' && hexRegex.test(config.textColor)) {
            setTextColor(config.textColor);
          }
        }

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

        // Import animation settings (2.1.0+)
        if (data.animation && typeof data.animation === 'object') {
          const duration = clamp(
            data.animation.duration,
            100,  // MIN_ANIMATION_DURATION
            5000, // MAX_ANIMATION_DURATION
            600   // DEFAULT
          );
          setAnimationDuration(Math.round(duration));
        }
        // If no animation object, duration stays at default or URL-initialized value

        // Import text state types and configs (v2.2.0+)
        // Missing state type fields default to 'pattern' for backward compatibility
        const validAlignments = ['left', 'center', 'right'];
        const validVerticalAlignments = ['top', 'center', 'bottom'];

        // Helper to validate and build TextConfig with defaults
        const parseTextConfig = (textConfig: unknown): {
          text: string;
          charHeight: number;
          alignment: 'left' | 'center' | 'right';
          verticalAlignment: 'top' | 'center' | 'bottom';
          wordWrap: boolean;
          invert: boolean;
          fontResolution: FontResolution;
        } => {
          const defaultConfig = {
            text: '',
            charHeight: 15,
            alignment: 'center' as const,
            verticalAlignment: 'center' as const,
            wordWrap: true,
            invert: false,
            fontResolution: 'mid' as FontResolution,
          };

          if (!textConfig || typeof textConfig !== 'object') {
            return defaultConfig;
          }

          const cfg = textConfig as Record<string, unknown>;

          // Validate and clamp text (max 500 chars)
          let text = '';
          if (typeof cfg.text === 'string') {
            text = cfg.text.slice(0, 500);
          }

          // Validate charHeight (5-100)
          const charHeight = Math.round(clamp(cfg.charHeight, 5, 100, 15));

          // Validate alignment
          const alignment = validAlignments.includes(cfg.alignment as string)
            ? (cfg.alignment as 'left' | 'center' | 'right')
            : 'center';

          // Validate verticalAlignment
          const verticalAlignment = validVerticalAlignments.includes(cfg.verticalAlignment as string)
            ? (cfg.verticalAlignment as 'top' | 'center' | 'bottom')
            : 'center';

          // Validate booleans
          const wordWrap = typeof cfg.wordWrap === 'boolean' ? cfg.wordWrap : true;
          const invert = typeof cfg.invert === 'boolean' ? cfg.invert : false;

          // Validate fontResolution
          const fontResolution: FontResolution =
            (cfg.fontResolution === 'low' || cfg.fontResolution === 'mid' || cfg.fontResolution === 'high')
              ? cfg.fontResolution
              : 'mid';

          return { text, charHeight, alignment, verticalAlignment, wordWrap, invert, fontResolution };
        };

        // Helper to parse pattern overlay config from imported JSON
        const parsePatternOverlayConfig = (cfg: unknown) => {
          if (!cfg || typeof cfg !== 'object') return null;
          const p = cfg as Record<string, unknown>;
          const validFillTypesLocal: FillType[] = ['linear', 'radial', 'angular', 'diamond', 'square', 'box'];
          return {
            threshold: clamp(p.threshold, 0, 1, 0.5),
            gamma: clamp(p.gamma, 0.1, 3, 1.0),
            scale: clamp(p.scale, 0.25, 1.0, 1.0),
            frequency: clamp(p.frequency, 0.01, 0.5, 0.1),
            contrast: clamp(p.contrast, 0.1, 3, 1.0),
            seed: clamp(p.seed, 0, 1, Math.round(Math.random() * 10000) / 10000),
            directionalNeighbors: Math.floor(clamp(p.directionalNeighbors, 0, 999, 8)),
            directionDensity: Math.floor(clamp(p.directionDensity, 0, 999, 50)),
            fillAmount: Math.floor(clamp(p.fillAmount, 0, 100, 50)),
            fillType: (validFillTypesLocal.includes(p.fillType as FillType) ? p.fillType as FillType : 'linear'),
            invertFill: typeof p.invertFill === 'boolean' ? p.invertFill : false,
          };
        };

        // Import fromStateType
        if (data.fromStateType === 'text') {
          setFromStateType('text');
          setFromTextConfig(parseTextConfig(data.fromTextConfig));
          if (data.fromTextPatternConfig && typeof data.fromTextPatternConfig === 'object') {
            state.setFromTextPatternEnabled(true);
            const parsed = parsePatternOverlayConfig(data.fromTextPatternConfig);
            if (parsed) state.setFromTextPatternParams(parsed);
          } else {
            state.setFromTextPatternEnabled(false);
          }
        } else {
          // Default to 'pattern' (v2.1.0 files or explicit 'pattern')
          setFromStateType('pattern');
          state.setFromTextPatternEnabled(false);
        }

        // Import toStateType
        if (data.toStateType === 'text') {
          setToStateType('text');
          setToTextConfig(parseTextConfig(data.toTextConfig));
          if (data.toTextPatternConfig && typeof data.toTextPatternConfig === 'object') {
            state.setToTextPatternEnabled(true);
            const parsed = parsePatternOverlayConfig(data.toTextPatternConfig);
            if (parsed) state.setToTextPatternParams(parsed);
          } else {
            state.setToTextPatternEnabled(false);
          }
        } else {
          // Default to 'pattern' (v2.1.0 files or explicit 'pattern')
          setToStateType('pattern');
          state.setToTextPatternEnabled(false);
        }

        // Import logo config (v2.3.0+)
        // Missing logo section defaults to disabled for backward compatibility
        if (data.logo && typeof data.logo === 'object') {
          state.setLogoConfig({
            enabled: typeof data.logo.enabled === 'boolean' ? data.logo.enabled : false,
            x: Math.round(clamp(data.logo.x, 0, 100, DEFAULT_LOGO_CONFIG.x)),
            y: Math.round(clamp(data.logo.y, 0, 100, DEFAULT_LOGO_CONFIG.y)),
            size: Math.round(clamp(data.logo.size, 5, 50, 15)),
            color: typeof data.logo.color === 'string' && hexRegex.test(data.logo.color) ? data.logo.color : '#FCFCFC',
            useForeground: typeof data.logo.useForeground === 'boolean' ? data.logo.useForeground : false,
          });
        } else {
          state.setLogoConfig({ ...DEFAULT_LOGO_CONFIG });
        }

        // Import text overlay config (v2.4.0+)
        if (data.textOverlay && typeof data.textOverlay === 'object') {
          const validAligns = ['left', 'center', 'right'];
          const validZOrders = ['above', 'behind'];
          const raw = data.textOverlay as Record<string, unknown>;
          const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];

          const entries: TextOverlayEntry[] = rawEntries.slice(0, 5).map((e: Record<string, unknown>) => ({
            id: typeof e.id === 'string' ? e.id : crypto.randomUUID(),
            content: typeof e.content === 'string' ? (e.content as string).slice(0, 500) : '',
            y: clamp(e.y, 0, 100, 50),
            fontSize: clamp(e.fontSize, 1, 20, 5),
            fontWeight: typeof e.fontWeight === 'number' && isValidFontWeight(e.fontWeight) ? e.fontWeight : 400,
            alignment: validAligns.includes(e.alignment as string) ? (e.alignment as TextOverlayEntry['alignment']) : 'center',
            color: typeof e.color === 'string' && hexRegex.test(e.color) ? e.color : '#FCFCFC',
            lineHeight: clamp(e.lineHeight, 1.0, 2.5, 1.4),
            sidePadding: clamp(e.sidePadding, 0, 40, 0),
            zOrder: validZOrders.includes(e.zOrder as string) ? (e.zOrder as TextOverlayEntry['zOrder']) : 'above',
            paths: Array.isArray(e.paths) ? e.paths : undefined,
          }));

          const importedConfig: TextOverlayConfig = {
            enabled: typeof raw.enabled === 'boolean' ? raw.enabled : entries.length > 0,
            entries,
          };
          state.setTextOverlayConfig(importedConfig);
        } else {
          state.setTextOverlayConfig({ ...DEFAULT_TEXT_OVERLAY_CONFIG });
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
    randomizeToParams,
    randomizeFromTextPatternParams,
    randomizeToTextPatternParams,
    swapFromTo,
    resetToDefaults,
    exportToSVG,
    copyToClipboard,
    exportSettingsAsJson,
    importSettingsFromJson,
  } as const;
}

export type FragmentActions = ReturnType<typeof useFragmentActions>;
