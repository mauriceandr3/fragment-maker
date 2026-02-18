import { useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface CellPosition {
  x: number;        // Grid column
  y: number;        // Grid row
  rectElement: SVGRectElement;
}

interface CellWithDistance extends CellPosition {
  distance: number; // BFS distance from nearest seed
  waveGroup: number; // Animation batch index
}

interface AnimState {
  aCellsOrdered: CellWithDistance[];  // "From" cells sorted by distance
  bCellsOrdered: CellWithDistance[];  // "To" cells sorted by distance
  sharedCells: CellPosition[];        // Seed points for growth
  connectionPath: CellPosition[];     // Temporary rects for snake animation

  aMaxWave: number;                   // Cache max wave for performance
  bMaxWave: number;                   // Cache max wave for performance

  startTime: number;
  currentProgress: number;            // Track current progress (0-1) for smooth reversal
  initialProgress: number;            // Progress when current animation phase started
  currentPhase: 'connection' | 'transition' | 'complete';
  direction: 'forward' | 'backward' | 'idle';
  animFrameId: number | null;
}

// Extract grid position from SVG rect
function extractCellPositions(
  rects: SVGRectElement[],
  cellSize: number
): CellPosition[] {
  return rects.map(rect => ({
    x: Math.round(parseInt(rect.getAttribute('x') || '0') / cellSize),
    y: Math.round(parseInt(rect.getAttribute('y') || '0') / cellSize),
    rectElement: rect
  }));
}

// BFS distance calculation (4 directions only)
function calculateDistanceMap(
  gridCols: number,
  gridRows: number,
  seedCells: CellPosition[],
  targetCells: CellPosition[]
): Map<string, number> {
  const distanceMap = new Map<string, number>();
  const queue: Array<{x: number, y: number, dist: number}> = [];

  // Initialize seeds at distance 0
  seedCells.forEach(seed => {
    distanceMap.set(`${seed.x},${seed.y}`, 0);
    queue.push({x: seed.x, y: seed.y, dist: 0});
  });

  // BFS flood fill (4 directions only)
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [
      {x: current.x - 1, y: current.y},  // left
      {x: current.x + 1, y: current.y},  // right
      {x: current.x, y: current.y - 1},  // up
      {x: current.x, y: current.y + 1},  // down
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= gridCols ||
          neighbor.y < 0 || neighbor.y >= gridRows) continue;

      const key = `${neighbor.x},${neighbor.y}`;
      const isTargetCell = targetCells.some(c => c.x === neighbor.x && c.y === neighbor.y);

      if (isTargetCell && !distanceMap.has(key)) {
        const newDist = current.dist + 1;
        distanceMap.set(key, newDist);
        queue.push({...neighbor, dist: newDist});
      }
    }
  }

  return distanceMap;
}

// Group cells into animation waves with randomization for organic feel
function groupIntoWaves(
  cellsWithDistance: CellWithDistance[],
  targetFrames: number
): CellWithDistance[] {
  if (cellsWithDistance.length === 0) return [];

  // Add random tie-breaker to each cell for stable randomization
  const cellsWithTieBreaker = cellsWithDistance.map(cell => ({
    ...cell,
    tieBreaker: Math.random()
  }));

  // Sort by distance first, then by random tie-breaker for same distance
  const sorted = cellsWithTieBreaker.sort((a, b) => {
    const distDiff = a.distance - b.distance;
    if (Math.abs(distDiff) < 0.1) {
      // Same distance level - use stable tie-breaker
      return a.tieBreaker - b.tieBreaker;
    }
    return distDiff;
  });

  // Assign continuous wave values for smoother animation
  // Start from 1 instead of 0 to avoid immediate visibility at progress=0
  return sorted.map((cell, index) => ({
    ...cell,
    waveGroup: ((index + 1) / sorted.length) * targetFrames
  }));
}

// Create snake connection path (Bresenham's line)
function createConnectionPath(
  fromCell: CellPosition,
  toCell: CellPosition,
  cellSize: number,
  svg: SVGSVGElement
): CellPosition[] {
  const path: CellPosition[] = [];

  // Bresenham's line algorithm
  let x0 = fromCell.x, y0 = fromCell.y;
  const x1 = toCell.x, y1 = toCell.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x0 !== x1 || y0 !== y1) {
    // Create temporary rect for connection
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x0 * cellSize));
    rect.setAttribute('y', String(y0 * cellSize));
    rect.setAttribute('width', String(cellSize));
    rect.setAttribute('height', String(cellSize));
    rect.setAttribute('fill', 'currentColor');
    rect.setAttribute('opacity', '0');
    rect.setAttribute('data-connection', 'true');

    svg.appendChild(rect);
    path.push({x: x0, y: y0, rectElement: rect as SVGRectElement});

    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }

  return path;
}

export function useFragmentReveal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  durationMs: number = 600,
  enabled: boolean = true
) {
  const stateRef = useRef<AnimState>({
    aCellsOrdered: [],
    bCellsOrdered: [],
    sharedCells: [],
    connectionPath: [],
    aMaxWave: 0,
    bMaxWave: 0,
    startTime: 0,
    currentProgress: 0,
    initialProgress: 0,
    currentPhase: 'complete',
    direction: 'idle',
    animFrameId: null,
  });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (stateRef.current.animFrameId !== null) {
        cancelAnimationFrame(stateRef.current.animFrameId);
        stateRef.current.animFrameId = null;
      }
    };
  }, []);

  const tick = useCallback((timestamp: number) => {
    const s = stateRef.current;

    if (!s.startTime) {
      s.startTime = timestamp;
    }

    const elapsed = timestamp - s.startTime;
    let progress = Math.min(elapsed / durationMs, 1);

    // Calculate effective progress based on direction
    // Use initialProgress (set once at animation start) to avoid exponential compounding
    let effectiveProgress: number;
    if (s.direction === 'forward') {
      // Linearly interpolate from initialProgress to 1.0
      effectiveProgress = s.initialProgress + (progress * (1.0 - s.initialProgress));
      effectiveProgress = Math.min(effectiveProgress, 1.0);
    } else if (s.direction === 'backward') {
      // Linearly interpolate from initialProgress to 0.0
      effectiveProgress = s.initialProgress * (1.0 - progress);
      effectiveProgress = Math.max(effectiveProgress, 0);
    } else {
      return;
    }

    if (s.direction === 'forward') {
      // Trigger final frame slightly early (at 98% progress) to ensure smooth completion
      if (progress >= 0.98) {
        // Final frame - directly set all cells to final state, no wave calculations
        s.aCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '0');
        s.bCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '1');
        s.connectionPath.forEach(cell => cell.rectElement.remove());
        s.connectionPath = [];
        s.currentProgress = 1.0;
        s.currentPhase = 'complete';
        s.direction = 'idle';
        s.animFrameId = null;

      } else {
        // Normal frames - wave-based animation
        s.currentProgress = effectiveProgress;

        const aCurrentWave = effectiveProgress * s.aMaxWave;
        const bCurrentWave = effectiveProgress * s.bMaxWave;

        s.aCellsOrdered.forEach(cell => {
          if (cell.waveGroup <= aCurrentWave) {
            cell.rectElement.style.opacity = '0';
          } else {
            cell.rectElement.style.opacity = '';
          }
        });

        s.bCellsOrdered.forEach(cell => {
          if (cell.waveGroup <= bCurrentWave) {
            cell.rectElement.style.opacity = '1';
          } else {
            cell.rectElement.style.opacity = '0';
          }
        });

        s.animFrameId = requestAnimationFrame(tick);
      }
    } else if (s.direction === 'backward') {
      // Cleanup connection paths
      if (s.connectionPath.length > 0) {
        s.connectionPath.forEach(cell => cell.rectElement.remove());
        s.connectionPath = [];
      }

      // Trigger final frame slightly early (at 98% progress) to ensure smooth completion
      if (progress >= 0.98) {
        // Final frame - directly set all cells to initial state
        s.aCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '');
        s.bCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '0');
        s.currentProgress = 0;
        s.direction = 'idle';
        s.animFrameId = null;

      } else {
        // Normal frames - use same wave logic as forward; decreasing effectiveProgress
        // naturally reverses the animation without any visual discontinuity
        s.currentProgress = effectiveProgress;

        const aCurrentWave = effectiveProgress * s.aMaxWave;
        const bCurrentWave = effectiveProgress * s.bMaxWave;

        s.aCellsOrdered.forEach(cell => {
          if (cell.waveGroup <= aCurrentWave) {
            cell.rectElement.style.opacity = '0';
          } else {
            cell.rectElement.style.opacity = '';
          }
        });

        s.bCellsOrdered.forEach(cell => {
          if (cell.waveGroup <= bCurrentWave) {
            cell.rectElement.style.opacity = '1';
          } else {
            cell.rectElement.style.opacity = '0';
          }
        });

        s.animFrameId = requestAnimationFrame(tick);
      }
    }
  }, [durationMs]);

  const ensureRects = useCallback((): boolean => {
    const s = stateRef.current;

    // Check if rects are already initialized and connected
    if (
      (s.aCellsOrdered.length > 0 && s.aCellsOrdered[0].rectElement.isConnected) ||
      (s.bCellsOrdered.length > 0 && s.bCellsOrdered[0].rectElement.isConnected)
    ) return true;

    const container = containerRef.current;
    if (!container) return false;

    const svg = container.querySelector('svg');
    if (!svg) return false;

    // 1. Query all rect elements
    const aRects = Array.from(svg.querySelectorAll('rect[data-g="a"]')) as SVGRectElement[];
    const bRects = Array.from(svg.querySelectorAll('rect[data-g="b"]')) as SVGRectElement[];
    const sharedRects = Array.from(svg.querySelectorAll('rect:not([data-g])')) as SVGRectElement[];

    if (aRects.length === 0 && bRects.length === 0) return false;

    // 2. Extract positions (determine cellSize from first rect)
    const firstRect = aRects[0] || bRects[0] || sharedRects[0];
    if (!firstRect) return false;

    const cellSize = parseInt(firstRect.getAttribute('width') || '1');
    const viewBox = svg.getAttribute('viewBox')?.split(' ') || [];
    const gridCols = Math.round(parseInt(viewBox[2] || '1056') / cellSize);
    const gridRows = Math.round(parseInt(viewBox[3] || '1056') / cellSize);

    const aCells = extractCellPositions(aRects, cellSize);
    const bCells = extractCellPositions(bRects, cellSize);
    const sharedCells = extractCellPositions(sharedRects, cellSize);

    // 3. Determine seed points
    let seedCells = sharedCells;
    if (seedCells.length === 0 && aCells.length > 0 && bCells.length > 0) {
      // Find nearest pair for connection path
      let minDist = Infinity;
      let nearestA: CellPosition | null = null;
      let nearestB: CellPosition | null = null;

      aCells.forEach(a => {
        bCells.forEach(b => {
          const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (dist < minDist) {
            minDist = dist;
            nearestA = a;
            nearestB = b;
          }
        });
      });

      if (nearestA && nearestB) {
        s.connectionPath = createConnectionPath(nearestA, nearestB, cellSize, svg);
        seedCells = [nearestA, nearestB]; // Use both endpoints as seeds
      }
    }

    // 4. Calculate distances
    const aDistances = calculateDistanceMap(gridCols, gridRows, seedCells, aCells);
    const bDistances = calculateDistanceMap(gridCols, gridRows, seedCells, bCells);

    // Handle orphaned cells (unreachable by BFS)
    const maxADistance = aDistances.size > 0 ? Math.max(...Array.from(aDistances.values())) : 0;
    const maxBDistance = bDistances.size > 0 ? Math.max(...Array.from(bDistances.values())) : 0;

    // 5. Attach distances to cells
    const aCellsWithDist = aCells.map(cell => ({
      ...cell,
      distance: aDistances.get(`${cell.x},${cell.y}`) ?? (maxADistance + 1),
      waveGroup: 0
    }));

    const bCellsWithDist = bCells.map(cell => ({
      ...cell,
      distance: bDistances.get(`${cell.x},${cell.y}`) ?? (maxBDistance + 1),
      waveGroup: 0
    }));

    // 6. Group into waves
    const targetFrames = Math.max(1, Math.ceil(durationMs / 16.67));
    s.aCellsOrdered = groupIntoWaves(aCellsWithDist, targetFrames);
    s.bCellsOrdered = groupIntoWaves(bCellsWithDist, targetFrames);
    s.sharedCells = sharedCells;

    // Cache max wave values for performance
    // Multiply by 1.05 so all cells animate before effectiveProgress reaches 0.95
    s.aMaxWave = s.aCellsOrdered.length > 0
      ? Math.max(...s.aCellsOrdered.map(c => c.waveGroup)) * 1.05
      : 0;
    s.bMaxWave = s.bCellsOrdered.length > 0
      ? Math.max(...s.bCellsOrdered.map(c => c.waveGroup)) * 1.05
      : 0;

    return true;
  }, [containerRef, durationMs]);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    if (!ensureRects()) return;
    const s = stateRef.current;

    if (reducedMotion) {
      // Instant transition for reduced motion
      s.aCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '0');
      s.bCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '1');
      s.connectionPath.forEach(cell => cell.rectElement.remove());
      s.connectionPath = [];
      s.currentProgress = 1;
      return;
    }

    // Cancel existing animation if running
    if (s.animFrameId !== null) {
      cancelAnimationFrame(s.animFrameId);
    }

    s.initialProgress = s.currentProgress;
    s.direction = 'forward';
    s.startTime = 0;
    s.animFrameId = requestAnimationFrame(tick);
  }, [tick, reducedMotion, enabled, ensureRects]);

  const onMouseLeave = useCallback(() => {
    if (!enabled) return;
    const s = stateRef.current;
    if (s.aCellsOrdered.length === 0 && s.bCellsOrdered.length === 0) return;

    if (reducedMotion) {
      // Instant reverse for reduced motion
      s.aCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '');
      s.bCellsOrdered.forEach(cell => cell.rectElement.style.opacity = '0');
      s.connectionPath.forEach(cell => cell.rectElement.remove());
      s.connectionPath = [];
      s.currentProgress = 0;
      return;
    }

    // Cancel existing animation if running
    if (s.animFrameId !== null) {
      cancelAnimationFrame(s.animFrameId);
    }

    s.initialProgress = s.currentProgress;
    s.direction = 'backward';
    s.startTime = 0;
    s.animFrameId = requestAnimationFrame(tick);
  }, [tick, reducedMotion, enabled]);

  return { onMouseEnter, onMouseLeave };
}
