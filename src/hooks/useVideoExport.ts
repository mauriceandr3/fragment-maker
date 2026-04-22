import { useState, useRef, useCallback } from 'react';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
import {
  type CellWithDistance,
  extractCellPositions,
  calculateDistanceMap,
  groupIntoWaves,
} from '@/lib/animationUtils';
import { getLogoSvgDataUrlById, LOGO_DEFINITIONS } from '@/lib/logoRegistry';
import type { LogoOverlayConfig, TextOverlayConfig, ImageOverlayConfig } from '@/app/components/fragment/types';
import { computeImageLayout, isImageBehindCells } from '@/implementation-files/imageOverlay';
import {
  generateFragmentSvgDirect,
  generateFragmentDiffFromConfigs,
  PARAM_RANGES,
  type FragmentConfig,
  type SeedableParam,
} from '@/implementation-files/generateFragmentSvg';

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
  /** Hover animation duration (one-way / loop). */
  durationMs: number;
  mode: 'one-way' | 'loop' | 'randomize';
  startHoldMs: number;
  middleHoldMs: number; // only used in loop mode
  endHoldMs: number;
  resolutionScale: number; // 1 | 2 | 3 | 4
  fps: 30 | 60;
  logoConfig?: LogoOverlayConfig;
  textOverlayConfig?: TextOverlayConfig;
  imageOverlayConfig?: ImageOverlayConfig;
  projectName?: string;
  /** Current From pattern (pattern–pattern); Randomize chains hover-style diffs from here. */
  randomizeFromConfig?: Omit<FragmentConfig, 'seedParam'>;
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

const RANDOMIZE_CHAIN_TRANSITION_MS = 2000;
const RANDOMIZE_CHAIN_PAUSE_MS = 1000;
const RANDOMIZE_CHAIN_BRANCHES = 5;
const RANDOMIZE_FILL_AMOUNT_MIN = 15;
const RANDOMIZE_FILL_AMOUNT_MAX = 50;

function randomFillAmountForRandomize(): number {
  return (
    RANDOMIZE_FILL_AMOUNT_MIN +
    Math.floor(Math.random() * (RANDOMIZE_FILL_AMOUNT_MAX - RANDOMIZE_FILL_AMOUNT_MIN + 1))
  );
}

function clampFillAmountForRandomize(n: number): number {
  return Math.min(
    RANDOMIZE_FILL_AMOUNT_MAX,
    Math.max(RANDOMIZE_FILL_AMOUNT_MIN, Math.round(n)),
  );
}

function randomInParamRange(param: SeedableParam): number {
  const { min, max, step } = PARAM_RANGES[param];
  if (max <= min) return min;
  const raw = min + Math.random() * (max - min);
  if (step >= 1) {
    return Math.min(max, Math.max(min, Math.round(raw)));
  }
  const rounded = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, rounded));
}

/**
 * Varies only the controls labeled "Density" (threshold) and "Fill amount" in the UI;
 * all other pattern fields stay the same as `base`.
 */
function randomPatternSnapshot(base: Omit<FragmentConfig, 'seedParam'>): Omit<FragmentConfig, 'seedParam'> {
  return {
    ...base,
    threshold: randomInParamRange('threshold'),
    fillAmount: randomFillAmountForRandomize(),
  };
}

function differsInDensityOrFill(
  a: Omit<FragmentConfig, 'seedParam'>,
  b: Omit<FragmentConfig, 'seedParam'>,
): boolean {
  return a.threshold !== b.threshold || a.fillAmount !== b.fillAmount;
}

/** Retries so consecutive configs differ in density or fill (avoids empty diff SVGs). */
function randomPatternAfter(
  base: Omit<FragmentConfig, 'seedParam'>,
  prev: Omit<FragmentConfig, 'seedParam'>,
): Omit<FragmentConfig, 'seedParam'> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const c = randomPatternSnapshot(base);
    if (differsInDensityOrFill(c, prev)) return c;
  }
  const nudgeT = (prev.threshold + 0.13) % 1.0001;
  const nudgedFill = clampFillAmountForRandomize(
    prev.fillAmount + (prev.fillAmount < 33 ? 7 : -7),
  );
  return {
    ...base,
    threshold: nudgeT === prev.threshold ? Math.min(1, prev.threshold + 0.05) : nudgeT,
    fillAmount: nudgedFill === prev.fillAmount ? RANDOMIZE_FILL_AMOUNT_MAX : nudgedFill,
  };
}

type RandomizeVideoSegment =
  | {
      kind: 'transition';
      fromConfig: Omit<FragmentConfig, 'seedParam'>;
      toConfig: Omit<FragmentConfig, 'seedParam'>;
      startFrame: number;
      frameCount: number;
    }
  | {
      kind: 'pause';
      config: Omit<FragmentConfig, 'seedParam'>;
      startFrame: number;
      frameCount: number;
    };

function makeRandomizeVideoPlan(
  base: Omit<FragmentConfig, 'seedParam'>,
  fps: 30 | 60,
): { segments: RandomizeVideoSegment[]; totalFrames: number } {
  const transFrames = Math.max(1, Math.ceil(RANDOMIZE_CHAIN_TRANSITION_MS / (1000 / fps)));
  const pauseFrames = Math.max(1, Math.ceil(RANDOMIZE_CHAIN_PAUSE_MS / (1000 / fps)));
  const randomStates: Omit<FragmentConfig, 'seedParam'>[] = [];
  let prevForRandom = base;
  for (let i = 0; i < RANDOMIZE_CHAIN_BRANCHES; i++) {
    const next = randomPatternAfter(base, prevForRandom);
    randomStates.push(next);
    prevForRandom = next;
  }
  const segments: RandomizeVideoSegment[] = [];
  let startFrame = 0;
  let prev = base;
  for (let i = 0; i < randomStates.length; i++) {
    const next = randomStates[i]!;
    segments.push({
      kind: 'transition',
      fromConfig: prev,
      toConfig: next,
      startFrame,
      frameCount: transFrames,
    });
    startFrame += transFrames;
    segments.push({
      kind: 'pause',
      config: next,
      startFrame,
      frameCount: pauseFrames,
    });
    startFrame += pauseFrames;
    prev = next;
  }
  // Back to the starting config so the last frame matches the first (loopable).
  segments.push({
    kind: 'transition',
    fromConfig: prev,
    toConfig: base,
    startFrame,
    frameCount: transFrames,
  });
  startFrame += transFrames;
  segments.push({
    kind: 'pause',
    config: base,
    startFrame,
    frameCount: pauseFrames,
  });
  startFrame += pauseFrames;
  return { segments, totalFrames: startFrame };
}

function segmentAtFrame(segments: RandomizeVideoSegment[], frame: number): RandomizeVideoSegment {
  for (const seg of segments) {
    if (frame >= seg.startFrame && frame < seg.startFrame + seg.frameCount) {
      return seg;
    }
  }
  return segments[segments.length - 1]!;
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

    const isRandomize = mode === 'randomize';

    if (!isVideoExportSupported) {
      setState({ status: 'error', progress: 0, error: 'VideoEncoder not supported in this browser.' });
      return;
    }

    if (isRandomize && !opts.randomizeFromConfig) {
      setState({ status: 'error', progress: 0, error: 'Randomize mode needs pattern settings.' });
      return;
    }

    cancelledRef.current = false;
    setState({ status: 'preparing', progress: 0, error: null });

    let randomizedChainPlan: { segments: RandomizeVideoSegment[]; totalFrames: number } | null = null;
    if (isRandomize) {
      randomizedChainPlan = makeRandomizeVideoPlan(opts.randomizeFromConfig!, fps);
    }

    // Offscreen container for SVG manipulation (must be in DOM for querySelectorAll)
    const svgContainer = document.createElement('div');
    svgContainer.style.position = 'fixed';
    svgContainer.style.left = '-99999px';
    svgContainer.style.top = '0';
    svgContainer.innerHTML = isRandomize ? '' : diffSvg;
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
      let svg: SVGSVGElement | null = svgContainer.querySelector('svg');
      let aCellsOrdered: CellWithDistance[] = [];
      let bCellsOrdered: CellWithDistance[] = [];
      let aMaxWave = 0;
      let bMaxWave = 0;

      if (!isRandomize) {
        if (!svg) throw new Error('No SVG found in diff output.');
        svg.setAttribute('width', String(encW));
        svg.setAttribute('height', String(encH));
        const waveData = computeWaveData(svg);
        if (!waveData) throw new Error('No animation cells found in SVG.');
        aCellsOrdered = waveData.aCellsOrdered;
        bCellsOrdered = waveData.bCellsOrdered;
        aMaxWave = waveData.aMaxWave;
        bMaxWave = waveData.bMaxWave;
      }

      // Pre-load image overlay if enabled (must happen before needsManualBackground check)
      let imageOverlayImg: HTMLImageElement | null = null;
      let imageOverlayLayout: { x: number; y: number; width: number; height: number } | null = null;
      const layerOrder = opts.imageOverlayConfig?.overlayLayerOrder ?? ['cells', 'image', 'text', 'logo'];
      const imageBehind = isImageBehindCells(layerOrder);

      if (opts.imageOverlayConfig?.enabled && opts.imageOverlayConfig.data && opts.imageOverlayConfig.originalWidth) {
        imageOverlayLayout = computeImageLayout(opts.imageOverlayConfig, opts.canvasWidth, opts.canvasHeight);
        // Scale layout to encoded dimensions
        const scaleX = encW / opts.canvasWidth;
        const scaleY = encH / opts.canvasHeight;
        imageOverlayLayout = {
          x: imageOverlayLayout.x * scaleX,
          y: imageOverlayLayout.y * scaleY,
          width: imageOverlayLayout.width * scaleX,
          height: imageOverlayLayout.height * scaleY,
        };
        imageOverlayImg = new Image();
        await new Promise<void>((resolve, reject) => {
          imageOverlayImg!.onload = () => resolve();
          imageOverlayImg!.onerror = () => reject(new Error('Failed to load image overlay'));
          imageOverlayImg!.src = opts.imageOverlayConfig!.data;
        });
      }

      const drawImageOverlay = () => {
        if (imageOverlayImg && imageOverlayLayout) {
          ctx.drawImage(imageOverlayImg, imageOverlayLayout.x, imageOverlayLayout.y, imageOverlayLayout.width, imageOverlayLayout.height);
        }
      };

      // If there are "behind" text entries OR the image is placed behind cells,
      // remove the SVG background rect so we can manually draw:
      //   background color → image (if behind) → behind text → SVG (transparent bg) → above text → logo
      const hasBehindText = opts.textOverlayConfig?.enabled &&
        opts.textOverlayConfig.entries.some(e => e.zOrder === 'behind' && e.content.trim());
      const needsManualBackground = hasBehindText || imageBehind;
      let svgBgColor = '';
      const stripBackgroundRectIfNeeded = (el: SVGSVGElement) => {
        if (!needsManualBackground) return;
        const firstRect = el.querySelector('rect');
        const viewBox = el.getAttribute('viewBox')?.split(' ') || [];
        const vbW = viewBox[2] || '';
        const vbH = viewBox[3] || '';
        const bgRect = firstRect &&
          firstRect.getAttribute('x') === '0' &&
          firstRect.getAttribute('y') === '0' &&
          firstRect.getAttribute('width') === vbW &&
          firstRect.getAttribute('height') === vbH
          ? firstRect : null;
        if (bgRect) {
          if (!svgBgColor) svgBgColor = bgRect.getAttribute('fill') || '#000000';
          bgRect.remove();
        }
      };

      if (!isRandomize && svg) {
        stripBackgroundRectIfNeeded(svg);
      }

      // Pre-load logo images if enabled
      const logoImages: { img: HTMLImageElement; x: number; y: number; w: number; h: number }[] = [];

      if (opts.logoConfig?.enabled && opts.logoConfig.entries.length > 0) {
        for (const entry of opts.logoConfig.entries) {
          const def = LOGO_DEFINITIONS[entry.logoId];
          if (!def) continue;
          const logoW = (entry.size / 100) * encW;
          const logoH = logoW / def.aspectRatio;
          const logoX = (entry.x / 100) * (encW - logoW);
          const logoY = (entry.y / 100) * (encH - logoH);

          const img = new Image();
          const logoDataUrl = getLogoSvgDataUrlById(entry.logoId, def.supportsColorChange ? entry.color : undefined);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load logo image'));
            img.src = logoDataUrl;
          });
          logoImages.push({ img, x: logoX, y: logoY, w: logoW, h: logoH });
        }
      }

      // Frame schedule
      const frameDuration = 1 / fps;
      let totalFrames: number;
      let animFrames = 0;
      let startHoldFrames = 0;
      let middleHoldFrames = 0;
      let endHoldFrames = 0;

      if (isRandomize && randomizedChainPlan) {
        totalFrames = Math.max(1, randomizedChainPlan.totalFrames);
      } else {
        animFrames = Math.ceil(durationMs / (1000 / fps));
        startHoldFrames = Math.ceil(startHoldMs / (1000 / fps));
        middleHoldFrames = Math.ceil(middleHoldMs / (1000 / fps));
        endHoldFrames = Math.ceil(endHoldMs / (1000 / fps));
        totalFrames = mode === 'loop'
          ? startHoldFrames + animFrames + middleHoldFrames + animFrames + endHoldFrames
          : startHoldFrames + animFrames + endHoldFrames;
      }

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

      const playbackMode: 'one-way' | 'loop' = mode === 'loop' ? 'loop' : 'one-way';

      let randomizeSegmentKey: string | null = null;
      let randomizeWave: {
        aCellsOrdered: CellWithDistance[];
        bCellsOrdered: CellWithDistance[];
        aMaxWave: number;
        bMaxWave: number;
      } | null = null;

      for (let frame = 0; frame < totalFrames; frame++) {
        if (cancelledRef.current) break;

        let svgToSerialize: SVGSVGElement;

        if (isRandomize && randomizedChainPlan) {
          const seg = segmentAtFrame(randomizedChainPlan.segments, frame);
          const segKey = `${seg.kind}-${seg.startFrame}`;
          if (segKey !== randomizeSegmentKey) {
            randomizeSegmentKey = segKey;
            if (seg.kind === 'transition') {
              svgContainer.innerHTML = generateFragmentDiffFromConfigs({
                fromConfig: seg.fromConfig,
                toConfig: seg.toConfig,
              });
              svg = svgContainer.querySelector('svg') as SVGSVGElement | null;
              if (!svg) throw new Error('No SVG in randomize transition.');
              svg.setAttribute('width', String(encW));
              svg.setAttribute('height', String(encH));
              const wd = computeWaveData(svg);
              if (!wd) {
                throw new Error(
                  'Randomize: this transition has no diff cells (patterns may be identical). Try again.',
                );
              }
              randomizeWave = {
                aCellsOrdered: wd.aCellsOrdered,
                bCellsOrdered: wd.bCellsOrdered,
                aMaxWave: wd.aMaxWave,
                bMaxWave: wd.bMaxWave,
              };
              stripBackgroundRectIfNeeded(svg);
            } else {
              svgContainer.innerHTML = generateFragmentSvgDirect(seg.config);
              svg = svgContainer.querySelector('svg') as SVGSVGElement | null;
              if (!svg) throw new Error('No SVG in randomize pause.');
              svg.setAttribute('width', String(encW));
              svg.setAttribute('height', String(encH));
              randomizeWave = null;
              stripBackgroundRectIfNeeded(svg);
            }
          }

          if (seg.kind === 'transition' && randomizeWave) {
            const localFrame = frame - seg.startFrame;
            const progress =
              seg.frameCount <= 1 ? 1 : Math.min(1, localFrame / (seg.frameCount - 1));
            applyWaveOpacity(
              randomizeWave.aCellsOrdered,
              randomizeWave.bCellsOrdered,
              progress,
              randomizeWave.aMaxWave,
              randomizeWave.bMaxWave,
            );
            svgToSerialize = svg!;
          } else {
            svgToSerialize = svg!;
          }
        } else {
          const effectiveProgress = calculateProgressForFrame(
            frame, animFrames, startHoldFrames, middleHoldFrames, playbackMode,
          );
          applyWaveOpacity(aCellsOrdered, bCellsOrdered, effectiveProgress, aMaxWave, bMaxWave);
          svgToSerialize = svg!;
        }

        // Serialize SVG → Blob URL → Image → Canvas
        const svgString = serializer.serializeToString(svgToSerialize);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.clearRect(0, 0, encW, encH);
            if (needsManualBackground) {
              ctx.fillStyle = svgBgColor;
              ctx.fillRect(0, 0, encW, encH);
              if (imageBehind) drawImageOverlay();
              if (hasBehindText) drawTextOverlay(ctx, opts.textOverlayConfig, 'behind', encW, encH);
            }
            ctx.drawImage(img, 0, 0, encW, encH);
            for (const layer of layerOrder) {
              if (layer === 'image' && !imageBehind) {
                drawImageOverlay();
              } else if (layer === 'text') {
                drawTextOverlay(ctx, opts.textOverlayConfig, 'above', encW, encH);
              } else if (layer === 'logo') {
                for (const logo of logoImages) {
                  ctx.drawImage(logo.img, logo.x, logo.y, logo.w, logo.h);
                }
              }
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
      link.download = opts.projectName ? `fragment-animation-${opts.projectName}.mp4` : 'fragment-animation.mp4';
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
