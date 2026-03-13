import { useState, useRef, useCallback } from 'react';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
import {
  type CellWithDistance,
  extractCellPositions,
  calculateDistanceMap,
  groupIntoWaves,
} from '@/lib/animationUtils';
import { getLogoSvgDataUrl, LOGO_ASPECT_RATIO } from '@/lib/dfinityLogo';
import type { LogoConfig, TextOverlayConfig } from '@/app/components/fragment/types';

type ExportStatus = 'idle' | 'preparing' | 'recording' | 'finalizing' | 'error';

interface VideoExportState {
  status: ExportStatus;
  progress: number;
  error: string | null;
}

interface ExportOptions {
  diffSvg: string;
  canvasWidth: number;
  canvasHeight: number;
  durationMs: number;
  mode: 'one-way' | 'loop';
  startHoldMs: number;
  middleHoldMs: number; // only used in loop mode
  endHoldMs: number;
  resolutionScale: number; // 1 | 2 | 3 | 4
  fps: 30 | 60;
  logoConfig?: LogoConfig;
  textOverlayConfig?: TextOverlayConfig;
}

export const isVideoExportSupported = typeof VideoEncoder !== 'undefined';

function calculateProgressForFrame(
  frame: number,
  animFrames: number,
  startHoldFrames: number,
  middleHoldFrames: number,
  mode: 'one-way' | 'loop',
): number {
  // Start hold
  if (frame < startHoldFrames) return 0.0;
  frame -= startHoldFrames;

  // Forward animation
  if (frame < animFrames) return frame / animFrames;
  frame -= animFrames;

  if (mode === 'loop') {
    // Middle hold (before reversing)
    if (frame < middleHoldFrames) return 1.0;
    frame -= middleHoldFrames;

    // Reverse animation
    if (frame < animFrames) return 1.0 - frame / animFrames;

    // End hold (start state)
    return 0.0;
  }

  // One-way: end hold (end state)
  return 1.0;
}

function applyWaveOpacity(
  aCells: CellWithDistance[],
  bCells: CellWithDistance[],
  effectiveProgress: number,
  aMaxWave: number,
  bMaxWave: number,
) {
  const aCurrentWave = effectiveProgress * aMaxWave;
  const bCurrentWave = effectiveProgress * bMaxWave;

  for (const cell of aCells) {
    cell.rectElement.style.opacity = cell.waveGroup <= aCurrentWave ? '0' : '';
  }
  for (const cell of bCells) {
    cell.rectElement.style.opacity = cell.waveGroup <= bCurrentWave ? '1' : '0';
  }
}

/** Compute BFS wave data for the given offscreen SVG, mirroring useFragmentReveal's ensureRects. */
function computeWaveData(svg: SVGSVGElement) {
  const aRects = Array.from(svg.querySelectorAll('rect[data-g="a"]')) as SVGRectElement[];
  const bRects = Array.from(svg.querySelectorAll('rect[data-g="b"]')) as SVGRectElement[];
  const sharedRects = Array.from(svg.querySelectorAll('rect:not([data-g])')) as SVGRectElement[];

  if (aRects.length === 0 && bRects.length === 0) return null;

  const firstRect = aRects[0] || bRects[0] || sharedRects[0];
  if (!firstRect) return null;

  const cellSize = parseInt(firstRect.getAttribute('width') || '1');
  const viewBox = svg.getAttribute('viewBox')?.split(' ') || [];
  const gridCols = Math.round(parseInt(viewBox[2] || '1056') / cellSize);
  const gridRows = Math.round(parseInt(viewBox[3] || '1056') / cellSize);

  const aCells = extractCellPositions(aRects, cellSize);
  const bCells = extractCellPositions(bRects, cellSize);
  const sharedCells = extractCellPositions(sharedRects, cellSize);

  let seedCells = sharedCells;
  if (seedCells.length === 0 && aCells.length > 0 && bCells.length > 0) {
    let minDist = Infinity;
    let nearestA = aCells[0];
    let nearestB = bCells[0];
    for (const a of aCells) {
      for (const b of bCells) {
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (dist < minDist) {
          minDist = dist;
          nearestA = a;
          nearestB = b;
        }
      }
    }
    seedCells = [nearestA, nearestB];
  }

  const aDistances = calculateDistanceMap(gridCols, gridRows, seedCells, aCells);
  const bDistances = calculateDistanceMap(gridCols, gridRows, seedCells, bCells);

  const maxADistance = aDistances.size > 0 ? Math.max(...Array.from(aDistances.values())) : 0;
  const maxBDistance = bDistances.size > 0 ? Math.max(...Array.from(bDistances.values())) : 0;

  const aCellsWithDist: CellWithDistance[] = aCells.map(cell => ({
    ...cell,
    distance: aDistances.get(`${cell.x},${cell.y}`) ?? (maxADistance + 1),
    waveGroup: 0,
  }));

  const bCellsWithDist: CellWithDistance[] = bCells.map(cell => ({
    ...cell,
    distance: bDistances.get(`${cell.x},${cell.y}`) ?? (maxBDistance + 1),
    waveGroup: 0,
  }));

  const targetFrames = 60;
  const aCellsOrdered = groupIntoWaves(aCellsWithDist, targetFrames);
  const bCellsOrdered = groupIntoWaves(bCellsWithDist, targetFrames);

  const aMaxWave = aCellsOrdered.length > 0
    ? Math.max(...aCellsOrdered.map(c => c.waveGroup)) * 1.05
    : 0;
  const bMaxWave = bCellsOrdered.length > 0
    ? Math.max(...bCellsOrdered.map(c => c.waveGroup)) * 1.05
    : 0;

  return { aCellsOrdered, bCellsOrdered, aMaxWave, bMaxWave };
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  config: TextOverlayConfig | undefined,
  position: 'above' | 'behind',
  canvasWidth: number,
  canvasHeight: number,
) {
  if (!config?.enabled) return;

  const entries = config.entries.filter(e => e.zOrder === position && e.content.trim());
  for (const entry of entries) {
    const fontSize = (entry.fontSize / 100) * canvasHeight;
    const absY = (entry.y / 100) * canvasHeight;
    const lineHeightPx = fontSize * entry.lineHeight;

    ctx.font = `${entry.fontWeight} ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = entry.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = entry.alignment === 'center' ? 'center' : entry.alignment === 'right' ? 'right' : 'left';

    const padPx = (entry.sidePadding / 100) * canvasWidth;
    const contentWidth = canvasWidth - padPx * 2;

    const anchorX = entry.alignment === 'center'
      ? canvasWidth / 2
      : entry.alignment === 'right'
        ? canvasWidth - padPx
        : padPx;

    const lines = entry.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const words = lines[i].split(/\s+/).filter(w => w.length > 0);
      if (words.length === 0) {
        continue;
      }

      const wrappedLines: string[] = [];
      let currentLine = words[0];
      for (let j = 1; j < words.length; j++) {
        const testLine = `${currentLine} ${words[j]}`;
        if (ctx.measureText(testLine).width > contentWidth) {
          wrappedLines.push(currentLine);
          currentLine = words[j];
        } else {
          currentLine = testLine;
        }
      }
      wrappedLines.push(currentLine);

      for (const wl of wrappedLines) {
        ctx.fillText(wl, anchorX, absY + i * lineHeightPx);
        i++;
      }
      i--; // compensate for outer loop increment
    }
  }
}

export function useVideoExport() {
  const [state, setState] = useState<VideoExportState>({
    status: 'idle',
    progress: 0,
    error: null,
  });
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const startExport = useCallback(async (opts: ExportOptions) => {
    const {
      diffSvg, canvasWidth, canvasHeight, durationMs,
      mode, startHoldMs, middleHoldMs, endHoldMs,
      resolutionScale, fps,
    } = opts;

    if (!isVideoExportSupported) {
      setState({ status: 'error', progress: 0, error: 'VideoEncoder not supported in this browser.' });
      return;
    }

    cancelledRef.current = false;
    setState({ status: 'preparing', progress: 0, error: null });

    // Offscreen container for SVG manipulation (must be in DOM for querySelectorAll)
    const svgContainer = document.createElement('div');
    svgContainer.style.position = 'fixed';
    svgContainer.style.left = '-99999px';
    svgContainer.style.top = '0';
    svgContainer.innerHTML = diffSvg;
    document.body.appendChild(svgContainer);

    // Scale canvas dimensions
    const scaledWidth = Math.round(canvasWidth * resolutionScale);
    const scaledHeight = Math.round(canvasHeight * resolutionScale);

    // H.264 requires even dimensions
    const encW = scaledWidth + (scaledWidth % 2);
    const encH = scaledHeight + (scaledHeight % 2);

    // Use HTMLCanvasElement (hidden) — needed for Image→drawImage rasterization
    const canvas = document.createElement('canvas');
    canvas.width = encW;
    canvas.height = encH;
    canvas.style.position = 'fixed';
    canvas.style.left = '-99999px';
    document.body.appendChild(canvas);

    try {
      const svg = svgContainer.querySelector('svg') as SVGSVGElement | null;
      if (!svg) throw new Error('No SVG found in diff output.');

      // Ensure SVG has explicit dimensions for Image rasterization
      svg.setAttribute('width', String(encW));
      svg.setAttribute('height', String(encH));

      const waveData = computeWaveData(svg);
      if (!waveData) throw new Error('No animation cells found in SVG.');

      const { aCellsOrdered, bCellsOrdered, aMaxWave, bMaxWave } = waveData;

      // If there are "behind" text entries, remove the SVG background rect
      // so we can draw: background color → behind text → SVG (transparent bg) → above text → logo
      const hasBehindText = opts.textOverlayConfig?.enabled &&
        opts.textOverlayConfig.entries.some(e => e.zOrder === 'behind' && e.content.trim());
      let svgBgColor = '';
      if (hasBehindText) {
        const firstRect = svg.querySelector('rect');
        const viewBox = svg.getAttribute('viewBox')?.split(' ') || [];
        const vbW = viewBox[2] || '';
        const vbH = viewBox[3] || '';
        const bgRect = firstRect &&
          firstRect.getAttribute('x') === '0' &&
          firstRect.getAttribute('y') === '0' &&
          firstRect.getAttribute('width') === vbW &&
          firstRect.getAttribute('height') === vbH
          ? firstRect : null;
        if (bgRect) {
          svgBgColor = bgRect.getAttribute('fill') || '#000000';
          bgRect.remove();
        }
      }

      // Pre-load logo image if enabled
      let logoImg: HTMLImageElement | null = null;
      let logoX = 0, logoY = 0, logoW = 0, logoH = 0;

      if (opts.logoConfig?.enabled) {
        logoW = (opts.logoConfig.size / 100) * encW;
        logoH = logoW / LOGO_ASPECT_RATIO;
        logoX = (opts.logoConfig.x / 100) * (encW - logoW);
        logoY = (opts.logoConfig.y / 100) * (encH - logoH);

        logoImg = new Image();
        const logoDataUrl = getLogoSvgDataUrl(opts.logoConfig.color);
        await new Promise<void>((resolve, reject) => {
          logoImg!.onload = () => resolve();
          logoImg!.onerror = () => reject(new Error('Failed to load logo image'));
          logoImg!.src = logoDataUrl;
        });
      }

      // Frame schedule
      const frameDuration = 1 / fps;
      const animFrames = Math.ceil(durationMs / (1000 / fps));
      const startHoldFrames = Math.ceil(startHoldMs / (1000 / fps));
      const middleHoldFrames = Math.ceil(middleHoldMs / (1000 / fps));
      const endHoldFrames = Math.ceil(endHoldMs / (1000 / fps));

      const totalFrames = mode === 'loop'
        ? startHoldFrames + animFrames + middleHoldFrames + animFrames + endHoldFrames
        : startHoldFrames + animFrames + endHoldFrames;

      // Set up Mediabunny output
      const bufferTarget = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target: bufferTarget,
      });

      const canvasSource = new CanvasSource(canvas, {
        codec: 'avc',
        bitrate: 8_000_000,
      });
      output.addVideoTrack(canvasSource);
      await output.start();

      const ctx = canvas.getContext('2d')!;
      const serializer = new XMLSerializer();

      // Reusable Image for SVG rasterization
      const img = new Image(encW, encH);

      setState({ status: 'recording', progress: 0, error: null });

      for (let frame = 0; frame < totalFrames; frame++) {
        if (cancelledRef.current) break;

        // Calculate progress for this frame
        const effectiveProgress = calculateProgressForFrame(
          frame, animFrames, startHoldFrames, middleHoldFrames, mode,
        );

        // Apply wave opacity to offscreen SVG
        applyWaveOpacity(aCellsOrdered, bCellsOrdered, effectiveProgress, aMaxWave, bMaxWave);

        // Serialize SVG → Blob URL → Image → Canvas
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.clearRect(0, 0, encW, encH);
            if (hasBehindText) {
              ctx.fillStyle = svgBgColor;
              ctx.fillRect(0, 0, encW, encH);
              drawTextOverlay(ctx, opts.textOverlayConfig, 'behind', encW, encH);
            }
            ctx.drawImage(img, 0, 0, encW, encH);
            drawTextOverlay(ctx, opts.textOverlayConfig, 'above', encW, encH);
            if (logoImg) {
              ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
            }
            URL.revokeObjectURL(blobUrl);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Failed to rasterize SVG frame.'));
          };
          img.src = blobUrl;
        });

        // Add frame with explicit timestamp and duration (in seconds)
        const timestamp = frame * frameDuration;
        await canvasSource.add(timestamp, frameDuration);

        // Update progress
        setState(prev => ({ ...prev, progress: (frame + 1) / totalFrames }));

        // Yield to main thread periodically so UI stays responsive
        if (frame % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (cancelledRef.current) {
        canvasSource.close();
        await output.finalize();
        svgContainer.remove();
        canvas.remove();
        setState({ status: 'idle', progress: 0, error: null });
        return;
      }

      // Finalize
      setState(prev => ({ ...prev, status: 'finalizing' }));
      canvasSource.close();
      await output.finalize();

      // Download
      const mp4Blob = new Blob([bufferTarget.buffer!], { type: 'video/mp4' });
      const url = URL.createObjectURL(mp4Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fragment-animation.mp4';
      link.click();
      URL.revokeObjectURL(url);

      setState({ status: 'idle', progress: 0, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during video export.';
      setState({ status: 'error', progress: 0, error: message });
      setTimeout(() => {
        setState(prev => prev.status === 'error' ? { status: 'idle', progress: 0, error: null } : prev);
      }, 4000);
    } finally {
      svgContainer.remove();
      canvas.remove();
    }
  }, []);

  return { state, startExport, cancelExport, isSupported: isVideoExportSupported } as const;
}
