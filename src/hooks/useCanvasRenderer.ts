import { useEffect, type RefObject } from "react";
import { isTransparent } from "@/lib/colorUtils";

export function useCanvasRenderer(options: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  grid: boolean[][];
  gridDimensions: { cols: number; rows: number; cellWidth: number; cellHeight: number; baseCols: number; baseRows: number };
  displayForeground: string;
  displayBackground: string;
  scale: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  allowCropping: boolean;
  cropDirection: 'width' | 'height';
  viewMode: 'single' | 'grid' | 'chars';
  animationEnabled: boolean;
}) {
  const {
    canvasRef, grid, gridDimensions,
    displayForeground, displayBackground,
    scale, cellSize, canvasWidth, canvasHeight,
    allowCropping, cropDirection, viewMode, animationEnabled,
  } = options;

  useEffect(() => {
    if (animationEnabled && viewMode === 'single') return;
    if (!canvasRef.current || !grid || grid.length === 0 || !grid[0]) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Detect if the grid is at base-cell level (text) or entity level (pattern)
    // by comparing grid dimensions to entity vs base dimensions
    const gridRows = grid.length;
    const gridColsSample = grid[0]?.length || 0;
    const isBaseLevel = gridRows > gridDimensions.rows || gridColsSample > gridDimensions.cols;
    const cols = isBaseLevel ? gridDimensions.baseCols : gridDimensions.cols;
    const rows = isBaseLevel ? gridDimensions.baseRows : gridDimensions.rows;
    const effectiveCellWidth = isBaseLevel ? cellSize : gridDimensions.cellWidth;
    const effectiveCellHeight = isBaseLevel ? cellSize : gridDimensions.cellHeight;
    const fractionalCellWidth = effectiveCellWidth * scale;
    const fractionalCellHeight = effectiveCellHeight * scale;

    const scaledCanvasWidth = Math.round(canvasWidth * scale);
    const scaledCanvasHeight = Math.round(canvasHeight * scale);
    canvas.width = scaledCanvasWidth;
    canvas.height = scaledCanvasHeight;

    const drawCheckerboard = (x0: number, y0: number, w: number, h: number, squareSize = 8) => {
      const saved = ctx.fillStyle;
      for (let cy = y0; cy < y0 + h; cy += squareSize) {
        for (let cx = x0; cx < x0 + w; cx += squareSize) {
          const col = Math.floor((cx - x0) / squareSize);
          const row = Math.floor((cy - y0) / squareSize);
          ctx.fillStyle = (col + row) % 2 === 0 ? '#cccccc' : '#999999';
          ctx.fillRect(cx, cy, Math.min(squareSize, x0 + w - cx), Math.min(squareSize, y0 + h - cy));
        }
      }
      ctx.fillStyle = saved;
    };

    if (isTransparent(displayBackground)) {
      drawCheckerboard(0, 0, scaledCanvasWidth, scaledCanvasHeight);
    } else {
      ctx.fillStyle = displayBackground;
      ctx.fillRect(0, 0, scaledCanvasWidth, scaledCanvasHeight);
    }

    for (let y = 0; y < Math.min(rows, grid.length); y++) {
      const cellY = Math.round(y * fractionalCellHeight);
      const nextCellY = Math.round((y + 1) * fractionalCellHeight);
      for (let x = 0; x < Math.min(cols, grid[y]?.length || 0); x++) {
        if (!grid[y][x]) continue;

        const cellX = Math.round(x * fractionalCellWidth);
        const nextCellX = Math.round((x + 1) * fractionalCellWidth);
        // Clip to canvas bounds (handles both cropping and partial elongated entities)
        const rectWidth = Math.min(nextCellX - cellX, scaledCanvasWidth - cellX);
        const rectHeight = Math.min(nextCellY - cellY, scaledCanvasHeight - cellY);

        if (rectWidth <= 0 || rectHeight <= 0) continue;

        if (isTransparent(displayForeground)) {
          drawCheckerboard(cellX, cellY, rectWidth, rectHeight);
        } else {
          ctx.fillStyle = displayForeground;
          ctx.fillRect(cellX, cellY, rectWidth, rectHeight);
        }
      }
    }
  }, [canvasRef, grid, displayForeground, displayBackground, scale, cellSize, gridDimensions, canvasWidth, canvasHeight, allowCropping, cropDirection, viewMode, animationEnabled]);
}
