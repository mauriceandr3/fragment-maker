import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, memo } from "react";
import { Shuffle, ChevronRight, ChevronLeft, Download, Copy, RotateCcw, FileJson, Square, LayoutGrid, Info } from "lucide-react";
import {
  type FillType,
  type SeedableParam,
  generateGridVariations,
  generateFragmentSvgDirect,
} from "../../lib/generateFragmentSvgGrid";
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
} from "../../lib/dimensionUtils";

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
interface GridSkeletonProps {
  aspectRatio: number; // width / height
}

const GridSkeleton = memo(function GridSkeleton({ aspectRatio }: GridSkeletonProps) {
  return (
    <div
      className="bg-black/40 rounded-lg overflow-hidden border border-white/20 animate-pulse"
      style={{ aspectRatio: aspectRatio }}
    >
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
  aspectRatio: number; // width / height
}

const GridItem = memo(function GridItem({
  svg,
  isHighlighted,
  varyingParam,
  paramValue,
  aspectRatio,
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
      className={`relative bg-black/40 rounded-lg overflow-hidden cursor-default transition-all duration-150 hover:scale-[1.02] ${
        isHighlighted
          ? 'ring-2 ring-white/60 border-2 border-white/50'
          : 'border border-white/20 hover:border-white/40'
      }`}
      style={{ aspectRatio: aspectRatio }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* SVG Container - fills the container with proper aspect ratio */}
      <div
        className="absolute inset-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
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
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);

  // Canvas dimensions state (width and height are now independent)
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_HEIGHT);

  // Input validation state - track string input values and errors
  const [widthInputValue, setWidthInputValue] = useState<string>(String(DEFAULT_WIDTH));
  const [widthInputError, setWidthInputError] = useState<string | null>(null);
  const [heightInputValue, setHeightInputValue] = useState<string>(String(DEFAULT_HEIGHT));
  const [heightInputError, setHeightInputError] = useState<string | null>(null);

  // Allow cropping mode (PRD-012)
  const [allowCropping, setAllowCropping] = useState(false);

  // Crop direction: which axis will have partial cells (PRD-015)
  const [cropDirection, setCropDirection] = useState<'width' | 'height'>('height');

  // Calculate valid cell sizes based on current dimensions (PRD-007)
  const validCellSizes = useMemo(() => {
    return getValidCellSizesForButtons(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  // Auto-select nearest valid cell size when dimensions change (PRD-010, PRD-011)
  useEffect(() => {
    if (validCellSizes.length === 0) {
      // No valid sizes - will be handled by blocking state (PRD-011a)
      return;
    }

    // If current cell size is valid, keep it (PRD-010)
    if (validCellSizes.includes(cellSize)) {
      return;
    }

    // Otherwise, select nearest valid size (PRD-011)
    const nearest = findNearestValidCellSize(validCellSizes, cellSize);
    if (nearest !== null) {
      setCellSize(nearest);
    }
  }, [validCellSizes, cellSize]);

  // Sync string input values with underlying state when changed externally (e.g., reset)
  useEffect(() => {
    setWidthInputValue(String(canvasWidth));
    setWidthInputError(null);
  }, [canvasWidth]);

  useEffect(() => {
    setHeightInputValue(String(canvasHeight));
    setHeightInputError(null);
  }, [canvasHeight]);

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
  const [debouncedCanvasWidth, setDebouncedCanvasWidth] = useState(canvasWidth);
  const [debouncedCanvasHeight, setDebouncedCanvasHeight] = useState(canvasHeight);
  const [debouncedAllowCropping, setDebouncedAllowCropping] = useState(allowCropping);
  const [debouncedCropDirection, setDebouncedCropDirection] = useState(cropDirection);

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

  // Debounce effect for canvas dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCanvasWidth(canvasWidth);
      setDebouncedCanvasHeight(canvasHeight);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [canvasWidth, canvasHeight]);

  // Debounce effect for cropping settings
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAllowCropping(allowCropping);
      setDebouncedCropDirection(cropDirection);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [allowCropping, cropDirection]);

  // Memoize grid dimensions - account for cropping mode
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
      canvasWidth: debouncedCanvasWidth,
      canvasHeight: debouncedCanvasHeight,
      allowCropping: debouncedAllowCropping,
      cropDirection: debouncedCropDirection,
    };
    return generateGridVariations(baseConfig, 'frequency', 20);
  }, [debouncedParams, debouncedForeground, debouncedBackground, debouncedInvertColors, debouncedCellSize, debouncedCanvasWidth, debouncedCanvasHeight, debouncedAllowCropping, debouncedCropDirection]);

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
      canvasWidth,
      canvasHeight,
      allowCropping,
      cropDirection,
    };
    return generateFragmentSvgDirect(config);
  }, [params, displayForeground, displayBackground, cellSize, canvasWidth, canvasHeight, allowCropping, cropDirection]);

  // Draw grid to canvas - handles cropping mode for preview
  useEffect(() => {
    if (!canvasRef.current || !grid || grid.length === 0 || !grid[0]) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { cols, rows } = gridDimensions;
    const scale = params.scale;
    const scaledCellWidth = Math.max(1, Math.round(cellSize * scale));
    const scaledCellHeight = Math.max(1, Math.round(cellSize * scale));

    // Canvas size is the actual user-specified dimensions (scaled)
    const scaledCanvasWidth = Math.round(canvasWidth * scale);
    const scaledCanvasHeight = Math.round(canvasHeight * scale);
    canvas.width = scaledCanvasWidth;
    canvas.height = scaledCanvasHeight;

    // Fill background for the entire canvas
    ctx.fillStyle = displayBackground;
    ctx.fillRect(0, 0, scaledCanvasWidth, scaledCanvasHeight);

    // Draw cells - with cropping, the last row/column may be partial
    for (let y = 0; y < Math.min(rows, grid.length); y++) {
      for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
        // Only draw foreground cells (background is already filled)
        if (!grid[y][x]) continue;

        let rectWidth = scaledCellWidth;
        let rectHeight = scaledCellHeight;

        if (allowCropping) {
          // Calculate partial cell dimensions at edges
          if (cropDirection === 'width' && x === cols - 1) {
            const remainingWidth = scaledCanvasWidth - x * scaledCellWidth;
            rectWidth = Math.min(scaledCellWidth, remainingWidth);
          }
          if (cropDirection === 'height' && y === rows - 1) {
            const remainingHeight = scaledCanvasHeight - y * scaledCellHeight;
            rectHeight = Math.min(scaledCellHeight, remainingHeight);
          }
        }

        if (rectWidth <= 0 || rectHeight <= 0) continue;

        ctx.fillStyle = displayForeground;
        ctx.fillRect(
          x * scaledCellWidth,
          y * scaledCellHeight,
          rectWidth,
          rectHeight
        );
      }
    }
  }, [grid, displayForeground, displayBackground, params.scale, cellSize, gridDimensions, canvasWidth, canvasHeight, allowCropping, cropDirection]);

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
    setCanvasWidth(DEFAULT_WIDTH);
    setCanvasHeight(DEFAULT_HEIGHT);
    setCellSize(DEFAULT_CELL_SIZE);
    setInvertColors(false);
    // Clear all validation errors
    setWidthInputError(null);
    setHeightInputError(null);
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
          {/* Blocking state when no valid cell sizes (PRD-011a) - only when not in cropping mode */}
          {!allowCropping && validCellSizes.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-8 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl">
                <p className="text-white/60 text-lg mb-2">No valid cell sizes</p>
                <p className="text-white/40 text-sm">Change dimensions or enable Allow cropping.</p>
              </div>
            </div>
          )}
          {(allowCropping || validCellSizes.length > 0) && viewMode === 'single' && (
            <canvas
              ref={canvasRef}
              className="border border-white/10 shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          {(allowCropping || validCellSizes.length > 0) && viewMode === 'grid' && (
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
                    <GridSkeleton key={index} aspectRatio={debouncedCanvasWidth / debouncedCanvasHeight} />
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
                        aspectRatio={debouncedCanvasWidth / debouncedCanvasHeight}
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

              {/* Canvas Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Width (px)</label>
                  <input
                    type="number"
                    min={MIN_CANVAS_DIMENSION}
                    max={MAX_CANVAS_DIMENSION}
                    value={widthInputValue}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setWidthInputValue(rawValue);

                      // Validate as user types
                      const parsed = parseFloat(rawValue);
                      if (rawValue === '' || isNaN(parsed)) {
                        setWidthInputError('Invalid number');
                      } else if (parsed < MIN_CANVAS_DIMENSION) {
                        setWidthInputError(`Minimum ${MIN_CANVAS_DIMENSION}px`);
                      } else if (parsed > MAX_CANVAS_DIMENSION) {
                        setWidthInputError(`Maximum ${MAX_CANVAS_DIMENSION}px`);
                      } else {
                        setWidthInputError(null);
                        // Round to integer and apply
                        const intValue = Math.round(parsed);
                        setCanvasWidth(intValue);
                        setWidthInputValue(String(intValue));
                      }
                    }}
                    onBlur={() => {
                      // Revert to last valid value on blur if invalid
                      if (widthInputError) {
                        setWidthInputValue(String(canvasWidth));
                        setWidthInputError(null);
                      }
                    }}
                    className={`w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm ${
                      widthInputError
                        ? 'border-2 border-red-500/60 focus:border-red-500/80'
                        : 'border border-white/20 focus:border-white/40'
                    }`}
                  />
                  {widthInputError && (
                    <span className="text-xs text-red-400 mt-1 block">{widthInputError}</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Height (px)</label>
                  <input
                    type="number"
                    min={MIN_CANVAS_DIMENSION}
                    max={MAX_CANVAS_DIMENSION}
                    value={heightInputValue}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setHeightInputValue(rawValue);

                      // Validate as user types
                      const parsed = parseFloat(rawValue);
                      if (rawValue === '' || isNaN(parsed)) {
                        setHeightInputError('Invalid number');
                      } else if (parsed < MIN_CANVAS_DIMENSION) {
                        setHeightInputError(`Minimum ${MIN_CANVAS_DIMENSION}px`);
                      } else if (parsed > MAX_CANVAS_DIMENSION) {
                        setHeightInputError(`Maximum ${MAX_CANVAS_DIMENSION}px`);
                      } else {
                        setHeightInputError(null);
                        // Round to integer and apply
                        const intValue = Math.round(parsed);
                        setCanvasHeight(intValue);
                        setHeightInputValue(String(intValue));
                      }
                    }}
                    onBlur={() => {
                      // Revert to last valid value on blur if invalid
                      if (heightInputError) {
                        setHeightInputValue(String(canvasHeight));
                        setHeightInputError(null);
                      }
                    }}
                    className={`w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm ${
                      heightInputError
                        ? 'border-2 border-red-500/60 focus:border-red-500/80'
                        : 'border border-white/20 focus:border-white/40'
                    }`}
                  />
                  {heightInputError && (
                    <span className="text-xs text-red-400 mt-1 block">{heightInputError}</span>
                  )}
                </div>
              </div>

              {/* Cell Size Control - Dynamic GCD-based buttons (PRD-007) or slider (PRD-013) */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Cell Size: {cellSize}px
                  {/* Evenly divisible indicator (PRD-014) */}
                  {allowCropping && validCellSizes.includes(cellSize) && (
                    <span className="ml-2 text-xs text-green-400">✓ Evenly divisible</span>
                  )}
                </label>
                {/* Cropping mode: slider from dynamicMin to 200 (PRD-013) */}
                {allowCropping && (
                  <div className="relative">
                    <input
                      type="range"
                      min={getDynamicMinCellSize(canvasWidth, canvasHeight)}
                      max={MAX_CELL_SIZE}
                      step="1"
                      value={cellSize}
                      onChange={(e) => setCellSize(parseInt(e.target.value))}
                      className="w-full h-6 rounded-lg appearance-none cursor-pointer relative z-10"
                      style={{
                        background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${
                          ((cellSize - getDynamicMinCellSize(canvasWidth, canvasHeight)) /
                            (MAX_CELL_SIZE - getDynamicMinCellSize(canvasWidth, canvasHeight))) *
                          100
                        }%, rgba(255, 255, 255, 0.2) ${
                          ((cellSize - getDynamicMinCellSize(canvasWidth, canvasHeight)) /
                            (MAX_CELL_SIZE - getDynamicMinCellSize(canvasWidth, canvasHeight))) *
                          100
                        }%, rgba(255, 255, 255, 0.2) 100%)`,
                      }}
                    />
                    {/* Tick marks for GCD divisors (PRD-014) */}
                    <div className="absolute inset-0 flex items-center pointer-events-none">
                      {validCellSizes.map((size) => {
                        const dynamicMin = getDynamicMinCellSize(canvasWidth, canvasHeight);
                        const range = MAX_CELL_SIZE - dynamicMin;
                        const position = ((size - dynamicMin) / range) * 100;
                        return (
                          <div
                            key={size}
                            className="absolute w-0.5 h-3 bg-white/60 rounded-full"
                            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                            title={`${size}px (evenly divisible)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Dynamic valid size buttons based on GCD - non-cropping mode */}
                {!allowCropping && (
                  <div className="flex flex-wrap gap-1.5">
                    {validCellSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setCellSize(size)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          cellSize === size
                            ? 'bg-white/20 border-2 border-white/40 text-white'
                            : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                )}
                {/* Hint when few valid sizes (PRD-011a) - only in non-cropping mode */}
                {!allowCropping && validCellSizes.length > 0 && validCellSizes.length <= 3 && (
                  <p className="text-xs text-white/40 mt-2">
                    Few valid sizes. Enable Allow cropping for more options.
                  </p>
                )}
                {/* Blocking state when no valid sizes (PRD-011a) - only in non-cropping mode */}
                {!allowCropping && validCellSizes.length === 0 && (
                  <p className="text-xs text-red-400 mt-2">
                    No valid sizes for these dimensions. Change dimensions or enable Allow cropping.
                  </p>
                )}
              </div>

              {/* Allow Cropping Checkbox (PRD-012) */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={allowCropping}
                  onChange={(e) => setAllowCropping(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-white"
                />
                <span className="text-sm text-white/60 group-hover:text-white transition-colors">Allow cropping</span>
                <div className="relative">
                  <Info className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs rounded-lg whitespace-normal w-64 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-200 z-20">
                    Enabling this allows any cell size, even if it doesn&apos;t perfectly divide the SVG dimensions. Fragments at the edge will be cropped.
                  </div>
                </div>
              </label>

              {/* Crop Direction Toggle (PRD-015) - only visible when Allow cropping is enabled */}
              {allowCropping && (
                <div className="mt-3">
                  <label className="block text-sm text-white/60 mb-2">Crop Direction</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCropDirection('width')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        cropDirection === 'width'
                          ? 'bg-white/20 border-2 border-white/40 text-white'
                          : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                      }`}
                    >
                      Crop width
                    </button>
                    <button
                      onClick={() => setCropDirection('height')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        cropDirection === 'height'
                          ? 'bg-white/20 border-2 border-white/40 text-white'
                          : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                      }`}
                    >
                      Crop height
                    </button>
                  </div>
                </div>
              )}

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
                disabled={!allowCropping && validCellSizes.length === 0}
                className={`group relative flex-1 backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                  !allowCropping && validCellSizes.length === 0
                    ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-black/30 hover:bg-white border-white/20 text-white hover:text-black hover:shadow-xl'
                }`}
              >
                <Download className="w-5 h-5" />
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
                  Export SVG
                </span>
              </button>

              <button
                onClick={copyToClipboard}
                disabled={!allowCropping && validCellSizes.length === 0}
                className={`group relative flex-1 backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                  !allowCropping && validCellSizes.length === 0
                    ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-black/30 hover:bg-white border-white/20 text-white hover:text-black hover:shadow-xl'
                }`}
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
              disabled={!allowCropping && validCellSizes.length === 0}
              className={`group relative w-full backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg mt-3 ${
                !allowCropping && validCellSizes.length === 0
                  ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-black/30 hover:bg-white/10 border-white/20 text-white/70 hover:text-white hover:shadow-xl'
              }`}
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