import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import {
  generateGridVariations,
  generateFragmentSvgDirect,
  generateFragmentDiffFromConfigs,
  generateDiffFromGrids,
} from "@/lib/generateFragmentSvgGrid";
import { generateGrid as generateGridCore, gridToSvg, buildMixedCellDiffSvg } from "@/implementation-files/generateFragmentSvg";
import { generateTextGrid, type FontData } from "@/implementation-files/generateTextGrid";
import { FONTS } from "@/lib/bitmapFonts";
import type { FragmentState } from "./useFragmentState";

// Cast FONTS to FontData since they share the same runtime shape
const fonts: FontData = FONTS;

export function useFragmentGeneration(state: FragmentState) {
  const {
    params,
    displayForeground,
    displayBackground,
    cellSize,
    canvasWidth,
    canvasHeight,
    allowCropping,
    cropDirection,
    elongateAxis,
    elongateAmount,
    gridDimensions,
    viewMode,
    debounced,
    fromStateType,
    fromTextConfig,
  } = state;

  const [grid, setGrid] = useState<boolean[][]>([]);
  const [hasGeneratedGrid, setHasGeneratedGrid] = useState(false);

  // Generate grid for single view (from state)
  // Supports both pattern and text state types
  const regenerateGrid = useCallback(() => {
    let newGrid: boolean[][];
    if (fromStateType === 'text') {
      // Text always uses base-cell dimensions (never stretched)
      const { baseCols, baseRows } = gridDimensions;
      if (!baseCols || !baseRows || baseCols <= 0 || baseRows <= 0) return;
      const result = generateTextGrid(fromTextConfig, baseCols, baseRows, fonts);
      newGrid = result.grid;
    } else {
      const { cols, rows } = gridDimensions;
      if (!cols || !rows || cols <= 0 || rows <= 0) {
        console.warn('Invalid grid dimensions:', { cols, rows });
        return;
      }
      newGrid = generateGridCore(
        cols, rows,
        params.seed, params.threshold, params.gamma,
        params.frequency, params.contrast, params.fillAmount,
        params.fillType, params.invertFill,
        params.directionalNeighbors, params.directionDensity,
      );
    }
    setGrid(newGrid);
  }, [gridDimensions, params, fromStateType, fromTextConfig]);

  // Trigger grid regeneration when parameters change
  useEffect(() => {
    regenerateGrid();
  }, [regenerateGrid]);

  // Generate SVG string for export/clipboard
  // Supports both pattern and text state types
  const generateSVG = useCallback((): string => {
    // For text state, use base-cell dimensions (text is never stretched)
    if (fromStateType === 'text') {
      const { baseCols, baseRows } = gridDimensions;
      if (baseCols <= 0 || baseRows <= 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50" fill="red">Invalid dimensions</text></svg>`;
      }
      const result = generateTextGrid(fromTextConfig, baseCols, baseRows, fonts);
      return gridToSvg(
        result.grid,
        baseCols,
        baseRows,
        cellSize,
        canvasWidth,
        displayForeground,
        displayBackground,
        canvasHeight,
      );
    }

    // For pattern state, use the existing direct approach
    const config = {
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
      foregroundColor: displayForeground,
      backgroundColor: displayBackground,
      cellSize,
      canvasWidth,
      canvasHeight,
      allowCropping,
      cropDirection,
      elongateAxis,
      elongateAmount,
    };
    return generateFragmentSvgDirect(config);
  }, [params, displayForeground, displayBackground, cellSize, canvasWidth, canvasHeight, allowCropping, cropDirection, elongateAxis, elongateAmount, gridDimensions, fromStateType, fromTextConfig]);

  // Generate diff SVG for animation preview
  // Supports all four combinations: Pattern↔Pattern, Pattern↔Text, Text↔Pattern, Text↔Text
  const diffSvg = useMemo(() => {
    if (!debounced.animationEnabled || !debounced.toParams) return '';

    const { cols, rows } = gridDimensions;
    if (cols <= 0 || rows <= 0) return '';

    const fromIsText = debounced.fromStateType === 'text';
    const toIsText = debounced.toStateType === 'text';

    // If both are pattern, use the optimized config-based approach
    if (!fromIsText && !toIsText) {
      const sharedSettings = {
        foregroundColor: displayForeground,
        backgroundColor: displayBackground,
        cellSize: debounced.cellSize,
        canvasWidth: debounced.canvasWidth,
        canvasHeight: debounced.canvasHeight,
        allowCropping: debounced.allowCropping,
        cropDirection: debounced.cropDirection,
        elongateAxis: debounced.elongateAxis,
        elongateAmount: debounced.elongateAmount,
      };

      const fromConfig = {
        threshold: debounced.params.threshold,
        gamma: debounced.params.gamma,
        frequency: debounced.params.frequency,
        contrast: debounced.params.contrast,
        seed: debounced.params.seed,
        directionalNeighbors: debounced.params.directionalNeighbors,
        directionDensity: debounced.params.directionDensity,
        fillAmount: debounced.params.fillAmount,
        fillType: debounced.params.fillType,
        invertFill: debounced.params.invertFill,
        ...sharedSettings,
      };

      const toConfig = {
        threshold: debounced.toParams.threshold,
        gamma: debounced.toParams.gamma,
        frequency: debounced.toParams.frequency,
        contrast: debounced.toParams.contrast,
        seed: debounced.toParams.seed,
        directionalNeighbors: debounced.toParams.directionalNeighbors,
        directionDensity: debounced.toParams.directionDensity,
        fillAmount: debounced.toParams.fillAmount,
        fillType: debounced.toParams.fillType,
        invertFill: debounced.toParams.invertFill,
        ...sharedSettings,
      };

      return generateFragmentDiffFromConfigs({ fromConfig, toConfig });
    }

    // At least one state is text — use mixed-cell diff with entity grouping.
    const { baseCols, baseRows, cols: entityCols, rows: entityRows } = gridDimensions;
    if (baseCols <= 0 || baseRows <= 0) return '';

    const generatePatternEntityGrid = (p: typeof debounced.params) =>
      generateGridCore(
        entityCols, entityRows,
        p.seed, p.threshold, p.gamma, p.frequency, p.contrast, p.fillAmount,
        p.fillType, p.invertFill, p.directionalNeighbors, p.directionDensity,
      );

    const mixedOpts = {
      elongateAxis: debounced.elongateAxis, elongateAmount: debounced.elongateAmount,
      baseCols, baseRows, cellSize: debounced.cellSize,
      width: debounced.canvasWidth, height: debounced.canvasHeight,
      foregroundColor: displayForeground, backgroundColor: displayBackground,
    };

    if (!fromIsText && toIsText) {
      return buildMixedCellDiffSvg({
        entityGrid: generatePatternEntityGrid(debounced.params),
        textGrid: generateTextGrid(debounced.toTextConfig, baseCols, baseRows, fonts).grid,
        ...mixedOpts, patternIsFrom: true,
      });
    } else if (fromIsText && !toIsText) {
      return buildMixedCellDiffSvg({
        entityGrid: generatePatternEntityGrid(debounced.toParams),
        textGrid: generateTextGrid(debounced.fromTextConfig, baseCols, baseRows, fonts).grid,
        ...mixedOpts, patternIsFrom: false,
      });
    } else {
      // Text → Text
      const gridFrom = generateTextGrid(debounced.fromTextConfig, baseCols, baseRows, fonts).grid;
      const gridTo = generateTextGrid(debounced.toTextConfig, baseCols, baseRows, fonts).grid;
      return generateDiffFromGrids({
        gridFrom, gridTo, cols: baseCols, rows: baseRows,
        cellSize: debounced.cellSize, width: debounced.canvasWidth, height: debounced.canvasHeight,
        foregroundColor: displayForeground, backgroundColor: displayBackground,
      });
    }
  }, [debounced, displayForeground, displayBackground, gridDimensions]);

  // Generate static SVG for the "to" state (used by Show End State preview)
  const toStateSvg = useMemo(() => {
    if (!debounced.animationEnabled || !debounced.toParams || !debounced.showEndState) return '';

    const { cols, rows } = gridDimensions;
    if (cols <= 0 || rows <= 0) return '';

    const toIsText = debounced.toStateType === 'text';

    if (toIsText) {
      // Text always uses base-cell dimensions (never stretched)
      const { baseCols, baseRows } = gridDimensions;
      if (baseCols <= 0 || baseRows <= 0) return '';
      const result = generateTextGrid(debounced.toTextConfig, baseCols, baseRows, fonts);
      return gridToSvg(
        result.grid,
        baseCols,
        baseRows,
        debounced.cellSize,
        debounced.canvasWidth,
        displayForeground,
        displayBackground,
        debounced.canvasHeight,
      );
    }

    return generateFragmentSvgDirect({
      threshold: debounced.toParams.threshold,
      gamma: debounced.toParams.gamma,
      frequency: debounced.toParams.frequency,
      contrast: debounced.toParams.contrast,
      seed: debounced.toParams.seed,
      directionalNeighbors: debounced.toParams.directionalNeighbors,
      directionDensity: debounced.toParams.directionDensity,
      fillAmount: debounced.toParams.fillAmount,
      fillType: debounced.toParams.fillType,
      invertFill: debounced.toParams.invertFill,
      foregroundColor: displayForeground,
      backgroundColor: displayBackground,
      cellSize: debounced.cellSize,
      canvasWidth: debounced.canvasWidth,
      canvasHeight: debounced.canvasHeight,
      allowCropping: debounced.allowCropping,
      cropDirection: debounced.cropDirection,
      elongateAxis: debounced.elongateAxis,
      elongateAmount: debounced.elongateAmount,
    });
  }, [debounced, displayForeground, displayBackground, gridDimensions]);

  // Grid view variations
  const gridVariations = useMemo(() => {
    const baseConfig = {
      threshold: debounced.params.threshold,
      gamma: debounced.params.gamma,
      frequency: debounced.params.frequency,
      contrast: debounced.params.contrast,
      seed: debounced.params.seed,
      directionalNeighbors: debounced.params.directionalNeighbors,
      directionDensity: debounced.params.directionDensity,
      fillAmount: debounced.params.fillAmount,
      fillType: debounced.params.fillType,
      invertFill: debounced.params.invertFill,
      foregroundColor: debounced.invertColors ? debounced.background : debounced.foreground,
      backgroundColor: debounced.invertColors ? debounced.foreground : debounced.background,
      cellSize: debounced.cellSize,
      canvasWidth: debounced.canvasWidth,
      canvasHeight: debounced.canvasHeight,
      allowCropping: debounced.allowCropping,
      cropDirection: debounced.cropDirection,
      elongateAxis: debounced.elongateAxis,
      elongateAmount: debounced.elongateAmount,
    };
    return generateGridVariations(baseConfig, 'frequency', 20);
  }, [debounced]);

  const gridSvgs = useMemo(() => {
    return gridVariations.map((config) => generateFragmentSvgDirect(config));
  }, [gridVariations]);

  const deferredGridSvgs = useDeferredValue(gridSvgs);
  const isGridStale = deferredGridSvgs !== gridSvgs;

  // Mark grid as generated after first render (for skeleton display)
  useEffect(() => {
    if (viewMode === 'grid' && gridSvgs.length > 0 && !hasGeneratedGrid) {
      requestAnimationFrame(() => {
        setHasGeneratedGrid(true);
      });
    }
  }, [viewMode, gridSvgs, hasGeneratedGrid]);

  // Reset hasGeneratedGrid when switching away from grid view
  useEffect(() => {
    if (viewMode === 'single') {
      setHasGeneratedGrid(false);
    }
  }, [viewMode]);

  // Find which grid item best matches the current frequency value
  const highlightedGridIndex = useMemo(() => {
    const currentValue = params.frequency;
    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < gridVariations.length; i++) {
      const gridValue = gridVariations[i].frequency;
      const diff = Math.abs(gridValue - currentValue);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }, [params.frequency, gridVariations]);

  return {
    grid,
    generateSVG,
    diffSvg,
    toStateSvg,
    gridVariations,
    gridSvgs,
    deferredGridSvgs,
    isGridStale,
    hasGeneratedGrid,
    highlightedGridIndex,
  } as const;
}

export type FragmentGeneration = ReturnType<typeof useFragmentGeneration>;
