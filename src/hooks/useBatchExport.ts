import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { generateFragmentSvgDirect } from '@/lib/generateFragmentSvgGrid';
import { generateLogoOverlaySvg, type LogoOverlayConfig } from '@/implementation-files/logoOverlay';
import type { GeneratorParams, StateType } from '@/app/components/fragment/types';
import type { CropDirection } from '@/implementation-files/generateFragmentSvg';

type BatchExportStatus = 'idle' | 'generating' | 'zipping' | 'error';

interface BatchExportState {
  status: BatchExportStatus;
  progress: number;
  currentItem: number;
  totalItems: number;
  error: string | null;
}

export interface BatchExportOptions {
  count: number;
  format: 'svg' | 'png';
  resolutionScale: 1 | 2 | 3 | 4;
  params: GeneratorParams;
  foregroundColor: string;
  backgroundColor: string;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  allowCropping: boolean;
  cropDirection: CropDirection;
  fromStateType: StateType;
  logoConfig: LogoOverlayConfig;
}

function injectLogo(svg: string, logoConfig: LogoOverlayConfig, width: number, height: number): string {
  if (!logoConfig.enabled) return svg;
  const logoSvg = generateLogoOverlaySvg(logoConfig, width, height);
  if (!logoSvg) return svg;
  return svg.replace('</svg>', `${logoSvg}</svg>`);
}

async function svgToPngBlob(
  svgString: string,
  width: number,
  height: number,
  scale: number,
): Promise<Blob> {
  const scaledW = Math.round(width * scale);
  const scaledH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = scaledW;
  canvas.height = scaledH;
  canvas.style.position = 'fixed';
  canvas.style.left = '-99999px';
  document.body.appendChild(canvas);

  try {
    const ctx = canvas.getContext('2d')!;
    const img = new Image(scaledW, scaledH);

    // Set explicit dimensions in SVG for proper rasterization
    const sizedSvg = svgString
      .replace(/width="[^"]*"/, `width="${scaledW}"`)
      .replace(/height="[^"]*"/, `height="${scaledH}"`);

    const blob = new Blob([sizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, scaledW, scaledH);
        URL.revokeObjectURL(blobUrl);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to rasterize SVG to canvas'));
      };
      img.src = blobUrl;
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
        'image/png',
      );
    });
  } finally {
    canvas.remove();
  }
}

export function useBatchExport() {
  const [state, setState] = useState<BatchExportState>({
    status: 'idle',
    progress: 0,
    currentItem: 0,
    totalItems: 0,
    error: null,
  });
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const startExport = useCallback(async (opts: BatchExportOptions) => {
    const {
      count, format, resolutionScale, params,
      foregroundColor, backgroundColor,
      cellSize, canvasWidth, canvasHeight,
      allowCropping, cropDirection, logoConfig,
    } = opts;

    cancelledRef.current = false;
    setState({
      status: 'generating',
      progress: 0,
      currentItem: 0,
      totalItems: count,
      error: null,
    });

    try {
      const zip = new JSZip();
      const padWidth = String(count).length;

      for (let i = 0; i < count; i++) {
        if (cancelledRef.current) {
          setState({ status: 'idle', progress: 0, currentItem: 0, totalItems: 0, error: null });
          return;
        }

        setState(prev => ({
          ...prev,
          currentItem: i + 1,
          progress: i / count,
        }));

        // Generate SVG with a random seed
        const config = {
          threshold: params.threshold,
          gamma: params.gamma,
          frequency: params.frequency,
          contrast: params.contrast,
          seed: Math.random(),
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
          cropDirection,
        };

        let svg = generateFragmentSvgDirect(config);
        svg = injectLogo(svg, logoConfig, canvasWidth, canvasHeight);

        const paddedIndex = String(i + 1).padStart(padWidth, '0');

        if (format === 'png') {
          const pngBlob = await svgToPngBlob(svg, canvasWidth, canvasHeight, resolutionScale);
          zip.file(`fragment-${paddedIndex}.png`, pngBlob);
        } else {
          zip.file(`fragment-${paddedIndex}.svg`, svg);
        }

        // Yield to main thread periodically
        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (cancelledRef.current) {
        setState({ status: 'idle', progress: 0, currentItem: 0, totalItems: 0, error: null });
        return;
      }

      setState(prev => ({ ...prev, status: 'zipping', progress: 1 }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fragments-${count}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setState({ status: 'idle', progress: 0, currentItem: 0, totalItems: 0, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during batch export.';
      setState({ status: 'error', progress: 0, currentItem: 0, totalItems: 0, error: message });
      setTimeout(() => {
        setState(prev => prev.status === 'error'
          ? { status: 'idle', progress: 0, currentItem: 0, totalItems: 0, error: null }
          : prev
        );
      }, 4000);
    }
  }, []);

  return { state, startExport, cancelExport } as const;
}
