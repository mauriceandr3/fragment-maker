import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, memo } from "react";
import { Shuffle, ChevronRight, ChevronLeft, Download, Copy, RotateCcw, FileJson, Square, LayoutGrid } from "lucide-react";
import {
  type CanvasSize,
  type FillType,
  type SeedableParam,
  CANVAS_SIZES,
  generateGridVariations,
  generateFragmentSvgDirect,
} from "../../lib/generateFragmentSvgGrid";
import {
  type AspectRatioPreset,
  type AspectRatio,
  ASPECT_RATIO_PRESETS,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CELL_SIZE,
  calculateHeight,
  adjustDimensionsAndCellSize,
} from "../../lib/dimensionUtils";

const CELL_SIZES = [12, 24, 36, 48, 60, 72, 84, 96];

// Debounce delay for settings changes (100ms per PRD-017)
const DEBOUNCE_DELAY = 100;

const COLOR_PRESETS = [
  { name: "Horizon White", background: "#000000", foreground: "#FCFCFC" },
  { name: "Signal Cyan", background: "#000000", foreground: "#00F9E1" },
  { name: "Neural Magenta", background: "#000000", foreground: "#FF00F7" },
  { name: "Path Lilac", background: "#000000", foreground: "#C2A3FF" },
  { name: "Source Blue", background: "#000000", foreground: "#BBE9FF" },
  { name: "Reason Green", background: "#000000", foreground: "#6CFF80" },
  { name: "Genesis Blue", background: "#000000", foreground: "#000DFB" },
];

interface GeneratorParams {
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

// Tooltip delay in ms (PRD-014)
const TOOLTIP_DELAY = 200;
const TOUCH_LONG_PRESS_DELAY = 500;

// Skeleton placeholder for loading state
const GridSkeleton = memo(function GridSkeleton() {
  return (
    <div className="aspect-square bg-black/40 rounded-lg overflow-hidden border border-white/20 animate-pulse">
      <div className="w-full h-full bg-white/5" />
    </div>
  );
});

// Memoized grid item component to prevent unnecessary re-renders
interface GridItemProps {
  svg: string;
  index: number;
  isHighlighted: boolean;
  varyingParam: SeedableParam;
  paramValue: number | string;
}

const GridItem = memo(function GridItem({
  svg,
  isHighlighted,
  varyingParam,
  paramValue,
}: GridItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedValue = typeof paramValue === 'number'
    ? (Number.isInteger(paramValue) ? paramValue : paramValue.toFixed(2))
    : paramValue;

  const paramLabel = varyingParam === 'threshold' ? 'Density' :
    varyingParam === 'fillAmount' ? 'Fill %' :
    varyingParam === 'directionalNeighbors' ? 'Dir. Neighbors' :
    varyingParam === 'directionDensity' ? 'Dir. Density' :
    varyingParam.charAt(0).toUpperCase() + varyingParam.slice(1);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, TOOLTIP_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const handleTouchStart = useCallback(() => {
    touchTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, TOUCH_LONG_PRESS_DELAY);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    // Delay hiding tooltip on touch to allow user to see it
    setTimeout(() => {
      setShowTooltip(false);
    }, 1000);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative aspect-square bg-black/40 rounded-lg overflow-hidden cursor-default transition-all duration-150 hover:scale-[1.02] ${
        isHighlighted
          ? 'ring-2 ring-white/60 border-2 border-white/50'
          : 'border border-white/20 hover:border-white/40'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* SVG Container - letterboxed */}
      <div
        className="absolute inset-0 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {/* Tooltip with delay (200ms hover, 500ms touch long-press) */}
      {showTooltip && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 whitespace-nowrap z-10">
          {paramLabel}: {formattedValue}
        </div>
      )}
    </div>
  );
});

export function AssetGenerator() {
  const [foregroundColor, setForegroundColor] = useState("#FCFCFC");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [customPreset, setCustomPreset] = useState({ background: "#000000", foreground: "#FCFCFC" });
  const [canvasSize, setCanvasSize] = useState<CanvasSize>('1K');
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);

  // Aspect ratio state
  const [aspectRatioPreset, setAspectRatioPreset] = useState<AspectRatioPreset>('1:1');
  const [customAspectRatio, setCustomAspectRatio] = useState<AspectRatio>({ width: 1, height: 1 });
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_HEIGHT);

  // PRD-006/007: Adjustment warning state
  const [adjustmentWarning, setAdjustmentWarning] = useState<string | null>(null);
  const adjustmentWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed current aspect ratio (from preset or custom)
  const currentAspectRatio = useMemo((): AspectRatio => {
    if (aspectRatioPreset === 'custom') {
      return customAspectRatio;
    }
    return ASPECT_RATIO_PRESETS[aspectRatioPreset];
  }, [aspectRatioPreset, customAspectRatio]);

  // PRD-004: Recalculate height when width or aspect ratio changes
  useEffect(() => {
    const newHeight = calculateHeight(canvasWidth, currentAspectRatio);
    setCanvasHeight(newHeight);
  }, [canvasWidth, currentAspectRatio]);

  // PRD-006: Auto-adjust cell size (or snap dimensions) when dimensions change
  useEffect(() => {
    const result = adjustDimensionsAndCellSize(
      canvasWidth,
      canvasHeight,
      cellSize,
      currentAspectRatio
    );

    if (result.adjusted) {
      if (result.adjustmentType === 'cellSize') {
        // Cell size was adjusted to fit dimensions
        setCellSize(result.cellSize);
      } else if (result.adjustmentType === 'dimensions') {
        // Dimensions were snapped to fit cell size
        setCanvasWidth(result.width);
        // Note: height will be recalculated by the PRD-004 effect
      }

      // Show warning message (PRD-007)
      if (result.message) {
        // Clear any existing timeout
        if (adjustmentWarningTimeoutRef.current) {
          clearTimeout(adjustmentWarningTimeoutRef.current);
        }
        setAdjustmentWarning(result.message);
        // Auto-dismiss after 5 seconds
        adjustmentWarningTimeoutRef.current = setTimeout(() => {
          setAdjustmentWarning(null);
        }, 5000);
      }
    }
  }, [canvasWidth, canvasHeight, currentAspectRatio]); // Note: cellSize intentionally excluded to avoid loops

  // Cleanup adjustment warning timeout on unmount
  useEffect(() => {
    return () => {
      if (adjustmentWarningTimeoutRef.current) {
        clearTimeout(adjustmentWarningTimeoutRef.current);
      }
    };
  }, []);

  const [invertColors, setInvertColors] = useState(false);
  const [params, setParams] = useState<GeneratorParams>({
    threshold: 0.5,
    gamma: 1.0,
    scale: 0.5,
    frequency: 0.1,
    contrast: 1.0,
    seed: Math.random(),
    directionalNeighbors: 8,
    directionDensity: 50,
    fillAmount: 50,
    fillType: 'linear',
    invertFill: false,
  });
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [hasGeneratedGrid, setHasGeneratedGrid] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Debounced state for grid generation (prevents regenerating on every slider tick)
  const [debouncedParams, setDebouncedParams] = useState(params);
  const [debouncedForeground, setDebouncedForeground] = useState(foregroundColor);
  const [debouncedBackground, setDebouncedBackground] = useState(backgroundColor);
  const [debouncedCellSize, setDebouncedCellSize] = useState(cellSize);
  const [debouncedInvertColors, setDebouncedInvertColors] = useState(invertColors);
  const [debouncedCanvasSize, setDebouncedCanvasSize] = useState(canvasSize);

  // Debounce effect for params
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams(params);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [params]);

  // Debounce effect for colors
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedForeground(foregroundColor);
      setDebouncedBackground(backgroundColor);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [foregroundColor, backgroundColor]);

  // Debounce effect for cell size
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCellSize(cellSize);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [cellSize]);

  // Debounce effect for invert colors
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInvertColors(invertColors);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [invertColors]);

  // Debounce effect for canvas size
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCanvasSize(canvasSize);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [canvasSize]);
  
  // Memoize grid dimensions
  const gridDimensions = useMemo(() => {
    const canvasDimensions = CANVAS_SIZES[canvasSize];
    const cols = Math.floor(canvasDimensions.width / cellSize);
    const rows = Math.floor(canvasDimensions.height / cellSize);
    return { cols, rows };
  }, [canvasSize, cellSize]);

  // Generate grid variations for Grid view (20 configs with varying parameter)
  // Uses debounced values to avoid regenerating on every slider tick
  const gridVariations = useMemo(() => {
    const baseConfig = {
      threshold: debouncedParams.threshold,
      gamma: debouncedParams.gamma,
      frequency: debouncedParams.frequency,
      contrast: debouncedParams.contrast,
      seed: debouncedParams.seed,
      directionalNeighbors: debouncedParams.directionalNeighbors,
      directionDensity: debouncedParams.directionDensity,
      fillAmount: debouncedParams.fillAmount,
      fillType: debouncedParams.fillType,
      invertFill: debouncedParams.invertFill,
      foregroundColor: debouncedInvertColors ? debouncedBackground : debouncedForeground,
      backgroundColor: debouncedInvertColors ? debouncedForeground : debouncedBackground,
      cellSize: debouncedCellSize,
      canvasSize: debouncedCanvasSize,
    };
    return generateGridVariations(baseConfig, 'frequency', 20);
  }, [debouncedParams, debouncedForeground, debouncedBackground, debouncedInvertColors, debouncedCellSize, debouncedCanvasSize]);

  // Generate SVG strings for each grid variation
  const gridSvgs = useMemo(() => {
    return gridVariations.map((config) => generateFragmentSvgDirect(config));
  }, [gridVariations]);

  // Use deferred value for the rendered SVGs to prevent UI blocking
  const deferredGridSvgs = useDeferredValue(gridSvgs);

  // Track if grid is currently generating (stale) for skeleton display
  const isGridStale = deferredGridSvgs !== gridSvgs;

  // Mark grid as generated after first render (for skeleton display)
  useEffect(() => {
    if (viewMode === 'grid' && gridSvgs.length > 0 && !hasGeneratedGrid) {
      // Use requestAnimationFrame to ensure skeletons render first
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

  // Find which grid item best matches the current base config value
  const highlightedGridIndex = useMemo(() => {
    // Get the current base value for frequency
    const currentValue = params.frequency;

    // Find the grid item with the closest value
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

  // Derive display colors based on invert flag
  const displayForeground = invertColors ? backgroundColor : foregroundColor;
  const displayBackground = invertColors ? foregroundColor : backgroundColor;

  // Seeded random number generator
  const seededRandom = useCallback((seed: number, x: number, y: number) => {
    const value = Math.sin(seed * 12.9898 + x * 78.233 + y * 43.758) * 43758.5453;
    return value - Math.floor(value);
  }, []);

  // Calculate fill threshold based on gradient type
  const calculateFillThreshold = useCallback((x: number, y: number, fillType: FillType, cols: number, rows: number): number => {
    const centerX = cols / 2;
    const centerY = rows / 2;
    
    switch (fillType) {
      case 'linear':
        return (y / rows) * 100;
        
      case 'radial':
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        return (distance / maxDistance) * 100;
        
      case 'angular':
        const angle = Math.atan2(y - centerY, x - centerX);
        return ((angle + Math.PI) / (2 * Math.PI)) * 100;
        
      case 'diamond':
        const diamondDistance = Math.abs(x - centerX) + Math.abs(y - centerY);
        const maxDiamondDistance = centerX + centerY;
        return (diamondDistance / maxDiamondDistance) * 100;
        
      case 'square':
        const squareDistance = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
        const maxSquareDistance = Math.max(centerX, centerY);
        return (squareDistance / maxSquareDistance) * 100;
    }
  }, []);

  // Create a boundary fragment extending from a cell
  const createBoundaryFragment = useCallback((
    grid: boolean[][], 
    startX: number, 
    startY: number, 
    color: boolean,
    seedOffset: number,
    currentParams: GeneratorParams
  ) => {
    if (currentParams.directionalNeighbors === 0) return;
    
    const actualRows = grid.length;
    const actualCols = grid[0]?.length || 0;
    
    if (actualCols === 0 || actualRows === 0) return;
    
    const directionSeed = seededRandom(currentParams.seed, seedOffset, 6000);
    const isHorizontal = directionSeed > 0.5;
    
    const signSeed = seededRandom(currentParams.seed, seedOffset, 6001);
    const direction = signSeed > 0.5 ? 1 : -1;
    
    const sizeSeed = seededRandom(currentParams.seed, seedOffset, 6002);
    const maxLength = Math.min(Math.floor(currentParams.directionalNeighbors / 50) + 2, 12);
    const length = Math.floor(sizeSeed * maxLength) + 2;
    
    const thicknessSeed = seededRandom(currentParams.seed, seedOffset, 6003);
    const thickness = thicknessSeed > 0.7 ? 2 : 1;
    
    if (isHorizontal) {
      for (let i = 0; i < length; i++) {
        const x = startX + (i * direction);
        if (x >= 0 && x < actualCols) {
          for (let t = 0; t < thickness; t++) {
            const y = startY + t;
            if (y >= 0 && y < actualRows) {
              grid[y][x] = color;
            }
          }
        }
      }
    } else {
      for (let i = 0; i < length; i++) {
        const y = startY + (i * direction);
        if (y >= 0 && y < actualRows) {
          for (let t = 0; t < thickness; t++) {
            const x = startX + t;
            if (x >= 0 && x < actualCols) {
              grid[y][x] = color;
            }
          }
        }
      }
    }
  }, [seededRandom]);

  // Apply directional neighbors at boundary transitions
  const applyDirectionalNeighbors = useCallback((grid: boolean[][], currentParams: GeneratorParams) => {
    if (currentParams.directionDensity === 0) return;
    if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) return;
    
    const actualRows = grid.length;
    const actualCols = grid[0].length;
    const boundaryCells: { x: number; y: number; color: boolean }[] = [];
    
    // Find boundary cells
    for (let y = 0; y < actualRows; y++) {
      for (let x = 0; x < actualCols; x++) {
        const currentColor = grid[y][x];
        const neighbors = [
          { x: x - 1, y },
          { x: x + 1, y },
          { x, y: y - 1 },
          { x, y: y + 1 },
        ];
        
        const isBoundary = neighbors.some(n => 
          n.x >= 0 && n.x < actualCols && n.y >= 0 && n.y < actualRows && 
          grid[n.y][n.x] !== currentColor
        );
        
        if (isBoundary) {
          boundaryCells.push({ x, y, color: currentColor });
        }
      }
    }
    
    // Select and create fragments
    const numFragments = Math.min(currentParams.directionDensity, boundaryCells.length);
    for (let i = 0; i < numFragments; i++) {
      const randomSeed = seededRandom(currentParams.seed, i, 5000);
      const index = Math.floor(randomSeed * boundaryCells.length);
      const cell = boundaryCells[index];
      createBoundaryFragment(grid, cell.x, cell.y, cell.color, i, currentParams);
    }
  }, [seededRandom, createBoundaryFragment]);

  // Generate grid based on parameters
  const generateGrid = useCallback(() => {
    const { cols, rows } = gridDimensions;
    
    // Safety check: ensure valid dimensions
    if (!cols || !rows || cols <= 0 || rows <= 0) {
      console.warn('Invalid grid dimensions:', { cols, rows });
      return;
    }
    
    const newGrid: boolean[][] = [];
    
    for (let y = 0; y < rows; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < cols; x++) {
        // Generate and process noise
        let noise = seededRandom(params.seed, x * params.frequency, y * params.frequency);
        noise = Math.pow(noise, params.gamma);
        noise = (noise - 0.5) * params.contrast + 0.5;
        noise = Math.max(0, Math.min(1, noise));
        
        // Calculate fill threshold
        const fillThreshold = calculateFillThreshold(x, y, params.fillType, cols, rows);
        const effectiveFillAmount = params.invertFill ? (100 - params.fillAmount) : params.fillAmount;
        const shouldFill = params.invertFill ? fillThreshold > effectiveFillAmount : fillThreshold <= effectiveFillAmount;
        
        row.push(shouldFill && noise > params.threshold);
      }
      newGrid.push(row);
    }
    
    applyDirectionalNeighbors(newGrid, params);
    setGrid(newGrid);
  }, [gridDimensions, params, seededRandom, calculateFillThreshold, applyDirectionalNeighbors]);

  // Generate SVG string using the module function for consistency
  const generateSVG = useCallback((): string => {
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
      canvasSize,
    };
    return generateFragmentSvgDirect(config);
  }, [params, displayForeground, displayBackground, cellSize, canvasSize]);

  // Draw grid to canvas
  useEffect(() => {
    if (!canvasRef.current || !grid || grid.length === 0 || !grid[0]) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const { cols, rows } = gridDimensions;
    const scaledCellWidth = cellSize * params.scale;
    const scaledCellHeight = cellSize * params.scale;
    canvas.width = cols * scaledCellWidth;
    canvas.height = rows * scaledCellHeight;
    
    for (let y = 0; y < Math.min(rows, grid.length); y++) {
      for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
        ctx.fillStyle = grid[y][x] ? displayForeground : displayBackground;
        ctx.fillRect(
          x * scaledCellWidth,
          y * scaledCellHeight,
          scaledCellWidth,
          scaledCellHeight
        );
      }
    }
  }, [grid, displayForeground, displayBackground, params.scale, cellSize, gridDimensions]);

  // Generate grid when parameters change
  useEffect(() => {
    generateGrid();
  }, [generateGrid]);

  const randomizeParams = () => {
    setParams({
      threshold: Math.random(),
      gamma: 0.5 + Math.random() * 2.5,
      scale: 1.0,
      frequency: 0.05 + Math.random() * 0.3,
      contrast: 0.5 + Math.random() * 2,
      seed: Math.random(),
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
    setCanvasSize('1K');
    setCellSize(48);
    setInvertColors(false);
    setParams({
      threshold: 0.5,
      gamma: 1.0,
      scale: 0.5,
      frequency: 0.1,
      contrast: 1.0,
      seed: Math.random(),
      directionalNeighbors: 8,
      directionDensity: 50,
      fillAmount: 50,
      fillType: 'linear',
      invertFill: false,
    });
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
    } catch (err) {
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
    const exportData = {
      version: '1.0.0',
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
        canvasSize,
      },
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

  return (
    <div className="max-w-full mx-auto h-screen flex flex-col bg-black">
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Canvas/Grid Area (shrinks) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* View Mode Toggle */}
          <div className="p-4 pl-8">
            <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
                  viewMode === 'single'
                    ? 'bg-white/20 border-2 border-white/40 text-white'
                    : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
                }`}
              >
                <Square className="w-4 h-4" />
                <span className="text-sm">Single</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white/20 border-2 border-white/40 text-white'
                    : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm">Grid</span>
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-[rgba(255,255,255,0.08)] flex items-center justify-start overflow-auto pl-8">
          {viewMode === 'single' && (
            <canvas
              ref={canvasRef}
              className="border border-white/10 shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          {viewMode === 'grid' && (
            <div className="w-full h-full overflow-auto p-4">
              {/* Parameter Variation Label */}
              <div className="mb-4 flex justify-center">
                <span className="text-white/60 text-sm">Variations in the frequency parameter</span>
              </div>

              {/* Grid of 20 SVG previews - uses deferred values for smooth UI */}
              {/* Responsive: 4 cols on narrow (<1200px), 5 cols on wide. Min item size: 120px */}
              {/* Show skeleton placeholders initially, reduced opacity when stale */}
              <div
                className={`grid gap-3 w-full max-w-[1060px] mx-auto grid-cols-[repeat(4,minmax(120px,1fr))] xl:grid-cols-[repeat(5,minmax(120px,1fr))] transition-opacity duration-150 ${
                  isGridStale ? 'opacity-70' : 'opacity-100'
                }`}
              >
                {!hasGeneratedGrid ? (
                  // Show skeleton placeholders immediately when switching to Grid view
                  Array.from({ length: 20 }, (_, index) => (
                    <GridSkeleton key={index} />
                  ))
                ) : (
                  deferredGridSvgs.map((svg, index) => {
                    const config = gridVariations[index];

                    return (
                      <GridItem
                        key={index}
                        svg={svg}
                        index={index}
                        isHighlighted={index === highlightedGridIndex}
                        varyingParam="frequency"
                        paramValue={config.frequency}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Right: Controls Panel (fixed width, doesn't shrink) */}
        {isCollapsed ? (
          /* Collapsed state - just show open button */
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex-shrink-0 flex items-center justify-center w-12 bg-black/60 backdrop-blur-xl border-l border-white/20 text-white/60 hover:text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div
            className="w-[400px] flex-shrink-0 bg-black/60 backdrop-blur-xl border-l border-white/20 overflow-hidden"
          >
            {/* Panel Content */}
            <div
              className="h-full overflow-y-auto space-y-6 p-6 pb-12"
              style={{
                fontFamily: 'Inter Tight, sans-serif',
                fontWeight: 300,
                scrollbarGutter: 'stable',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2">
                <h1 className="text-lg text-white tracking-wide">Fragment Generator</h1>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <>
            {/* Canvas Settings */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">Canvas Settings</h2>

              {/* Aspect Ratio Presets */}
              <div>
                <label className="block text-sm text-white/60 mb-3">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {(['1:1', '4:3', '3:2', '16:9', '9:16', 'custom'] as AspectRatioPreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAspectRatioPreset(preset)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all shadow-lg ${
                        aspectRatioPreset === preset
                          ? 'bg-white/20 border-2 border-white/40 text-white'
                          : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                      }`}
                    >
                      {preset === 'custom' ? 'Custom' : preset}
                    </button>
                  ))}
                </div>

                {/* Custom Ratio Inputs - only visible when Custom is selected */}
                {aspectRatioPreset === 'custom' && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={customAspectRatio.width}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setCustomAspectRatio({ ...customAspectRatio, width: Math.max(1, Math.min(99, value)) });
                      }}
                      className="w-16 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                    />
                    <span className="text-white/60 text-sm">:</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={customAspectRatio.height}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setCustomAspectRatio({ ...customAspectRatio, height: Math.max(1, Math.min(99, value)) });
                      }}
                      className="w-16 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                    />
                  </div>
                )}
              </div>

              {/* Canvas Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Width (px)</label>
                  <input
                    type="number"
                    min="64"
                    max="4096"
                    value={canvasWidth}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 64;
                      // Clear any existing warning when user makes a new change
                      setAdjustmentWarning(null);
                      setCanvasWidth(Math.max(64, Math.min(4096, value)));
                    }}
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Height (px)</label>
                  <input
                    type="number"
                    min="64"
                    max="4096"
                    value={canvasHeight}
                    readOnly
                    disabled
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white/50 focus:outline-none transition-colors backdrop-blur-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* PRD-007: Adjustment Warning Toast */}
              {adjustmentWarning && (
                <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-3 py-2 text-sm text-yellow-200">
                  {adjustmentWarning}
                </div>
              )}

              <div className="border-t border-white/10 my-4"></div>

              {/* Legacy Canvas Size - TODO: Remove in PRD-008 */}
              <h3 className="text-sm text-white/60 mb-3">Canvas Size</h3>
              <div className="flex gap-3">
                {(['1K', '2K', '4K'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setCanvasSize(size)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
                      canvasSize === size
                        ? 'bg-white/20 border-2 border-white/40 text-white'
                        : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 my-4"></div>

              {/* Zoom Controls */}
              <h3 className="text-sm text-white/60 mb-3">Zoom</h3>
              <div className="flex gap-3">
                {[
                  { label: '25%', scale: 0.25 },
                  { label: '50%', scale: 0.5 },
                  { label: '100%', scale: 1.0 }
                ].map(({ label, scale }) => (
                  <button
                    key={label}
                    onClick={() => setParams({ ...params, scale })}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
                      params.scale === scale
                        ? 'bg-white/20 border-2 border-white/40 text-white'
                        : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
              
            {/* Color Inputs */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">Colors</h2>
              
              {/* Color Presets */}
              <div className="space-y-2">
                <label className="block text-sm text-white/60 mb-3">Presets</label>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isActive = foregroundColor.toUpperCase() === preset.foreground.toUpperCase() && 
                                    backgroundColor.toUpperCase() === preset.background.toUpperCase();
                    return (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setForegroundColor(preset.foreground);
                          setBackgroundColor(preset.background);
                          setCustomPreset({ background: preset.background, foreground: preset.foreground });
                        }}
                        className={`relative py-2.5 px-3 rounded-lg text-left transition-all shadow-lg overflow-hidden group ${
                          isActive
                            ? 'border-2 border-white/40'
                            : 'border border-white/20 hover:border-white/30'
                        }`}
                      >
                        <div className="absolute inset-0 flex">
                          <div className="w-1/2" style={{ backgroundColor: preset.background }} />
                          <div className="w-1/2" style={{ backgroundColor: preset.foreground }} />
                        </div>
                        <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <div className="text-xs text-white font-medium">{preset.name}</div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Custom Preset Button */}
                  {(() => {
                    const isCustomActive = foregroundColor.toUpperCase() === customPreset.foreground.toUpperCase() && 
                                          backgroundColor.toUpperCase() === customPreset.background.toUpperCase();
                    return (
                      <button
                        onClick={() => {
                          setForegroundColor(customPreset.foreground);
                          setBackgroundColor(customPreset.background);
                        }}
                        className={`relative py-2.5 px-3 rounded-lg text-left transition-all shadow-lg overflow-hidden group ${
                          isCustomActive
                            ? 'border-2 border-white/40'
                            : 'border border-white/20 hover:border-white/30'
                        }`}
                      >
                        <div className="absolute inset-0 flex">
                          <div className="w-1/2" style={{ backgroundColor: customPreset.background }} />
                          <div className="w-1/2" style={{ backgroundColor: customPreset.foreground }} />
                        </div>
                        <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                          <div className="text-xs text-white font-medium">Custom</div>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
              
              <div className="border-t border-white/10 my-4"></div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">Foreground</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => {
                      setForegroundColor(e.target.value);
                      setCustomPreset({ ...customPreset, foreground: e.target.value });
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
                  />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => {
                      setForegroundColor(e.target.value);
                      setCustomPreset({ ...customPreset, foreground: e.target.value });
                    }}
                    className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                    placeholder="#FCFCFC"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">Background</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      setCustomPreset({ ...customPreset, background: e.target.value });
                    }}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => {
                      setBackgroundColor(e.target.value);
                      setCustomPreset({ ...customPreset, background: e.target.value });
                    }}
                    className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>
              
              {/* Invert Colors Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={invertColors}
                  onChange={(e) => setInvertColors(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-white"
                />
                <span className="text-sm text-white/60 group-hover:text-white transition-colors">Invert Colors</span>
              </label>
            </div>
            
            {/* Parameter Sliders */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">Parameters</h2>
              
              {/* Cell Scale Dropdown */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Cell Scale: {cellSize}px
                </label>
                <select
                  value={cellSize}
                  onChange={(e) => setCellSize(parseInt(e.target.value))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm cursor-pointer"
                >
                  {CELL_SIZES.map((size) => (
                    <option key={size} value={size} className="bg-black text-white">
                      {size}px
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Density: {params.threshold.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={params.threshold}
                  onChange={(e) => setParams({ ...params, threshold: parseFloat(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${params.threshold * 100}%, rgba(255, 255, 255, 0.2) ${params.threshold * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Fill Amount: {params.fillAmount}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={params.fillAmount}
                  onChange={(e) => setParams({ ...params, fillAmount: parseInt(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${params.fillAmount}%, rgba(255, 255, 255, 0.2) ${params.fillAmount}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              {/* Fill Type Selector */}
              <div>
                <label className="block text-sm text-white/60 mb-3">Fill Type</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['linear', 'radial', 'angular', 'diamond', 'square'] as const).map((type) => {
                    const typeLabels = {
                      linear: 'Linear',
                      radial: 'Radial',
                      angular: 'Angular',
                      diamond: 'Diamond',
                      square: 'Square'
                    };
                    return (
                      <button
                        key={type}
                        onClick={() => setParams({ ...params, fillType: type })}
                        className={`py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
                          params.fillType === type
                            ? 'bg-white/20 border-2 border-white/40 text-white'
                            : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                        }`}
                      >
                        {typeLabels[type]}
                      </button>
                    );
                  })}
                </div>
                
                {/* Invert Fill Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={params.invertFill}
                    onChange={(e) => setParams({ ...params, invertFill: e.target.checked })}
                    className="w-5 h-5 rounded cursor-pointer accent-white"
                  />
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">Invert Fill Direction</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Gamma: {params.gamma.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={params.gamma}
                  onChange={(e) => setParams({ ...params, gamma: parseFloat(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${((params.gamma - 0.1) / 2.9) * 100}%, rgba(255, 255, 255, 0.2) ${((params.gamma - 0.1) / 2.9) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Frequency: {params.frequency.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={params.frequency}
                  onChange={(e) => setParams({ ...params, frequency: parseFloat(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${((params.frequency - 0.01) / 0.49) * 100}%, rgba(255, 255, 255, 0.2) ${((params.frequency - 0.01) / 0.49) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Contrast: {params.contrast.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={params.contrast}
                  onChange={(e) => setParams({ ...params, contrast: parseFloat(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${((params.contrast - 0.1) / 2.9) * 100}%, rgba(255, 255, 255, 0.2) ${((params.contrast - 0.1) / 2.9) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Directional Neighbors: {params.directionalNeighbors}
                </label>
                <input
                  type="range"
                  min="0"
                  max="999"
                  step="1"
                  value={params.directionalNeighbors}
                  onChange={(e) => setParams({ ...params, directionalNeighbors: parseInt(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${(params.directionalNeighbors / 999) * 100}%, rgba(255, 255, 255, 0.2) ${(params.directionalNeighbors / 999) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Direction Density: {params.directionDensity}
                </label>
                <input
                  type="range"
                  min="0"
                  max="999"
                  step="1"
                  value={params.directionDensity}
                  onChange={(e) => setParams({ ...params, directionDensity: parseInt(e.target.value) })}
                  className="w-full h-6 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${(params.directionDensity / 999) * 100}%, rgba(255, 255, 255, 0.2) ${(params.directionDensity / 999) * 100}%, rgba(255, 255, 255, 0.2) 100%)`,
                  }}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={randomizeParams}
                className="group relative flex-1 bg-black/40 hover:bg-white backdrop-blur-md border border-white/30 text-white hover:text-black py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
              >
                <Shuffle className="w-5 h-5" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
                  Generate Random
                </span>
              </button>
              
              <button
                onClick={exportToSVG}
                className="group relative flex-1 bg-black/30 hover:bg-white backdrop-blur-md border border-white/20 text-white hover:text-black py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
                  Export SVG
                </span>
              </button>
              
              <button
                onClick={copyToClipboard}
                className="group relative flex-1 bg-black/30 hover:bg-white backdrop-blur-md border border-white/20 text-white hover:text-black py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
              >
                <Copy className="w-5 h-5" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
                  Copy SVG for Figma
                </span>
              </button>
            </div>
            
            {/* Reset Button */}
            <button
              onClick={resetToDefaults}
              className="group relative w-full bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset to Default Settings</span>
            </button>

            {/* Export Settings as JSON */}
            <button
              onClick={exportSettingsAsJson}
              className="group relative w-full bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl mt-3"
            >
              <FileJson className="w-4 h-4" />
              <span className="text-sm">Export Settings as JSON</span>
            </button>
            </>
          </div>

          {/* Fade Mask at Bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)'
            }}
          />
          </div>
        )}
      </div>
    </div>
  );
}