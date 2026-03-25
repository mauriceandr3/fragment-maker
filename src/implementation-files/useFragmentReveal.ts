import { useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  type CellPosition,
  type CellWithDistance,
  extractCellPositions,
  calculateDistanceMap,
  groupIntoWaves,
} from '../lib/animationUtils';

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

// Create snake connection path (Bresenham's line)
function createConnectionPath(
  fromCell: CellPosition,
  toCell: CellPosition,
  cellWidth: number,
  cellHeight: number,
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
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x0 * cellWidth));
    rect.setAttribute('y', String(y0 * cellHeight));
    rect.setAttribute('width', String(cellWidth));
    rect.setAttribute('height', String(cellHeight));
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

    // 2. Extract positions (determine cell dimensions from first rect)
    const firstRect = aRects[0] || bRects[0] || sharedRects[0];
    if (!firstRect) return false;

    const cellWidth = parseInt(firstRect.getAttribute('width') || '1');
    const cellHeight = parseInt(firstRect.getAttribute('height') || '1');
    const viewBox = svg.getAttribute('viewBox')?.split(' ') || [];
    const gridCols = Math.round(parseInt(viewBox[2] || '1056') / cellWidth);
    const gridRows = Math.round(parseInt(viewBox[3] || '1056') / cellHeight);

    const aCells = extractCellPositions(aRects, cellWidth, cellHeight);
    const bCells = extractCellPositions(bRects, cellWidth, cellHeight);
    const sharedCells = extractCellPositions(sharedRects, cellWidth, cellHeight);

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
        s.connectionPath = createConnectionPath(nearestA, nearestB, cellWidth, cellHeight, svg);
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
