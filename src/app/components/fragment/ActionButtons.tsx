import { useState, type RefObject } from "react";
import { Download, Copy, FileJson, Upload, Package, X, ImageIcon } from "lucide-react";
import type { FragmentActions } from "@/hooks/useFragmentActions";
import type { useBatchExport, BatchExportOptions } from '@/hooks/useBatchExport';
import type { LogoOverlayConfig, ImageOverlayConfig, TextOverlayConfig } from './types';
import type { GeneratorParams, StateType } from './types';
import type { CropDirection } from '@/implementation-files/generateFragmentSvg';
import { recompressDataUrl, FILE_EXTENSIONS, type ImageExportFormat } from '@/lib/imageUtils';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { RadioSelector } from '../ui/RadioSelector';
import { Slider } from '../ui/Slider';

type BatchExport = ReturnType<typeof useBatchExport>;

// Build a human-readable list of what's blocking SVG export
function getSvgDisabledReason(
  animationEnabled: boolean,
  logoConfig: LogoOverlayConfig,
  textOverlayConfig: TextOverlayConfig,
  imageOverlayConfig: ImageOverlayConfig,
): string | null {
  const blocking: string[] = [];
  if (animationEnabled) blocking.push('animation');
  if (logoConfig.enabled) blocking.push('logo');
  if (textOverlayConfig.enabled) blocking.push('text overlay');
  if (imageOverlayConfig.enabled) blocking.push('image overlay');
  if (blocking.length === 0) return null;
  return `SVG export only includes the raw pattern. Disable ${blocking.join(', ')} to export.`;
}

interface ExportSvgPanelProps {
  actions: FragmentActions;
  batchExport: BatchExport;
  allowCropping: boolean;
  validCellSizes: number[];
  animationEnabled: boolean;
  logoConfig: LogoOverlayConfig;
  textOverlayConfig: TextOverlayConfig;
  imageOverlayConfig: ImageOverlayConfig;
  params: GeneratorParams;
  foregroundColor: string;
  backgroundColor: string;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  cropDirection: CropDirection;
  fromStateType: StateType;
  projectName?: string;
}

export function ExportSvgPanel({
  actions, batchExport,
  allowCropping, validCellSizes,
  animationEnabled, logoConfig, textOverlayConfig, imageOverlayConfig,
  params, foregroundColor, backgroundColor, cellSize,
  canvasWidth, canvasHeight, cropDirection, fromStateType,
  projectName,
}: ExportSvgPanelProps) {
  const [count, setCount] = useState(1);
  const [countInput, setCountInput] = useState('1');

  const noValidSize = !allowCropping && validCellSizes.length === 0;
  const svgDisabledReason = getSvgDisabledReason(animationEnabled, logoConfig, textOverlayConfig, imageOverlayConfig);
  const isDisabled = noValidSize || svgDisabledReason !== null;
  const disabledTitle = noValidSize ? 'No valid cell sizes.' : (svgDisabledReason ?? undefined);

  const batchStatus = batchExport.state.status;
  const isExporting = batchStatus === 'generating' || batchStatus === 'zipping';

  const handleCountChange = (raw: string) => {
    setCountInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) setCount(parsed);
  };
  const handleCountBlur = () => {
    const parsed = parseInt(countInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      setCountInput(String(count));
    } else {
      const clamped = Math.max(1, Math.min(100, parsed));
      setCount(clamped);
      setCountInput(String(clamped));
    }
  };

  const handleExport = () => {
    if (count === 1) {
      actions.exportToSVG();
    } else {
      const opts: BatchExportOptions = {
        count, format: 'svg', resolutionScale: 1,
        params, foregroundColor, backgroundColor, cellSize,
        canvasWidth, canvasHeight, allowCropping, cropDirection, fromStateType,
        logoConfig, imageOverlayConfig, projectName,
      };
      batchExport.startExport(opts);
    }
  };

  return (
    <Section title="SVG" borderless>
      {isDisabled && svgDisabledReason && (
        <p className="text-xs text-white/40 mb-3">{svgDisabledReason}</p>
      )}

      <div className="mb-3">
        <label className="block text-sm text-white/60 mb-1">Count</label>
        <input
          type="number" min={1} max={100}
          value={countInput}
          onChange={(e) => handleCountChange(e.target.value)}
          onBlur={handleCountBlur}
          disabled={isDisabled || isExporting}
          className="w-full bg-black/30 border border-white/20 focus:border-white/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {count > 1 && !isDisabled && (
        <p className="text-xs text-white/40 mb-3">
          Generates multiple variations by randomizing the seed. All other parameters stay the same.
        </p>
      )}

      {isExporting ? (
        <div className="relative w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-lg mb-2">
          <div className="absolute inset-0 bg-white/10 transition-all duration-150" style={{ width: `${Math.round(batchExport.state.progress * 100)}%` }} />
          <div className="relative flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/70 animate-pulse" />
              <span className="text-sm text-white/70">
                {batchStatus === 'generating' && `Generating ${batchExport.state.currentItem}/${batchExport.state.totalItems}`}
                {batchStatus === 'zipping' && 'Creating ZIP...'}
              </span>
            </div>
            <Button variant="icon" size="sm" onClick={batchExport.cancelExport}
              className="border-0 bg-transparent hover:bg-white/10 text-white/50 hover:text-white shadow-none hover:shadow-none"
              icon={<X className="w-4 h-4" />} />
          </div>
        </div>
      ) : (
        <Button onClick={handleExport} disabled={isDisabled} title={disabledTitle} fullWidth icon={<Download className="w-4 h-4" />}>
          {count === 1 ? 'Export SVG' : `Export ${count} SVGs`}
        </Button>
      )}

      {batchExport.state.status === 'error' && batchExport.state.error && (
        <div className="w-full bg-red-500/20 border border-red-500/30 rounded-xl py-2 px-4 mt-2">
          <span className="text-sm text-red-300">{batchExport.state.error}</span>
        </div>
      )}

      {count === 1 && (
        <Button onClick={actions.copyToClipboard} disabled={isDisabled} title={disabledTitle} fullWidth icon={<Copy className="w-4 h-4" />}>
          Copy SVG for Figma
        </Button>
      )}
    </Section>
  );
}

interface ExportPngPanelProps {
  batchExport: BatchExport;
  allowCropping: boolean;
  validCellSizes: number[];
  animationEnabled: boolean;
  textOverlayConfig: TextOverlayConfig;
  params: GeneratorParams;
  foregroundColor: string;
  backgroundColor: string;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  cropDirection: CropDirection;
  fromStateType: StateType;
  logoConfig: LogoOverlayConfig;
  imageOverlayConfig: ImageOverlayConfig;
  projectName?: string;
}

export function ExportPngPanel({
  batchExport,
  allowCropping, validCellSizes,
  animationEnabled, textOverlayConfig,
  params, foregroundColor, backgroundColor, cellSize,
  canvasWidth, canvasHeight, cropDirection, fromStateType,
  logoConfig, imageOverlayConfig,
  projectName,
}: ExportPngPanelProps) {
  const [count, setCount] = useState(1);
  const [countInput, setCountInput] = useState('1');
  const [resolutionScale, setResolutionScale] = useState<1 | 2 | 3 | 4>(2);

  const noValidSize = !allowCropping && validCellSizes.length === 0;
  const isDisabled = noValidSize || animationEnabled;
  const disabledTitle = noValidSize
    ? 'No valid cell sizes.'
    : animationEnabled ? 'PNG export is not available when animation is enabled.' : undefined;

  const batchStatus = batchExport.state.status;
  const isExporting = batchStatus === 'generating' || batchStatus === 'zipping';

  const handleCountChange = (raw: string) => {
    setCountInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) setCount(parsed);
  };
  const handleCountBlur = () => {
    const parsed = parseInt(countInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      setCountInput(String(count));
    } else {
      const clamped = Math.max(1, Math.min(100, parsed));
      setCount(clamped);
      setCountInput(String(clamped));
    }
  };

  const handleExport = () => {
    const opts: BatchExportOptions = {
      count, format: 'png', resolutionScale,
      params, foregroundColor, backgroundColor, cellSize,
      canvasWidth, canvasHeight, allowCropping, cropDirection, fromStateType,
      logoConfig, imageOverlayConfig, textOverlayConfig, projectName,
    };
    batchExport.startExport(opts);
  };

  return (
    <Section title="PNG" borderless>
      {animationEnabled && (
        <p className="text-xs text-white/40 mb-3">PNG export is not available when animation is enabled.</p>
      )}
      <div className="mb-3">
        <label className="block text-sm text-white/60 mb-1">Count</label>
        <input
          type="number" min={1} max={100}
          value={countInput}
          onChange={(e) => handleCountChange(e.target.value)}
          onBlur={handleCountBlur}
          disabled={isDisabled || isExporting}
          className="w-full bg-black/30 border border-white/20 focus:border-white/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {count > 1 && !isDisabled && (
        <p className="text-xs text-white/40 mb-3">
          Generates multiple variations by randomizing the seed. All other parameters stay the same.
        </p>
      )}

      <div className="mb-3">
        <label className={`block text-sm mb-2 ${isDisabled ? 'text-white/30' : 'text-white/60'}`}>
          Resolution <span className={isDisabled ? 'text-white/20' : 'text-white/40'}>({canvasWidth * resolutionScale} &times; {canvasHeight * resolutionScale}px)</span>
        </label>
        <RadioSelector
          options={[{ label: '1×', value: '1' }, { label: '2×', value: '2' }, { label: '3×', value: '3' }, { label: '4×', value: '4' }]}
          value={String(resolutionScale)}
          onChange={(v) => setResolutionScale(Number(v) as 1 | 2 | 3 | 4)}
          disabled={isDisabled}
        />
      </div>

      {isExporting ? (
        <div className="relative w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-white/10 transition-all duration-150" style={{ width: `${Math.round(batchExport.state.progress * 100)}%` }} />
          <div className="relative flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/70 animate-pulse" />
              <span className="text-sm text-white/70">
                {batchStatus === 'generating' && `Generating ${batchExport.state.currentItem}/${batchExport.state.totalItems}`}
                {batchStatus === 'zipping' && 'Creating ZIP...'}
              </span>
            </div>
            <Button variant="icon" size="sm" onClick={batchExport.cancelExport}
              className="border-0 bg-transparent hover:bg-white/10 text-white/50 hover:text-white shadow-none hover:shadow-none"
              icon={<X className="w-4 h-4" />} />
          </div>
        </div>
      ) : (
        <Button onClick={handleExport} disabled={isDisabled} title={disabledTitle} fullWidth icon={<Download className="w-4 h-4" />}>
          {count === 1 ? 'Export PNG' : `Export ${count} PNGs`}
        </Button>
      )}

      {batchExport.state.status === 'error' && batchExport.state.error && (
        <div className="w-full bg-red-500/20 border border-red-500/30 rounded-xl py-2 px-4 mt-2">
          <span className="text-sm text-red-300">{batchExport.state.error}</span>
        </div>
      )}
    </Section>
  );
}

interface ExportImagePanelProps {
  imageOverlayConfig: ImageOverlayConfig;
  canvasWidth: number;
  canvasHeight: number;
  projectName?: string;
}

export function ExportImagePanel({ imageOverlayConfig, canvasWidth, canvasHeight, projectName }: ExportImagePanelProps) {
  const [format, setFormat] = useState<ImageExportFormat>('png');
  const [quality, setQuality] = useState(85);
  const [exporting, setExporting] = useState(false);

  const hasImage = imageOverlayConfig.enabled && !!imageOverlayConfig.data;

  const handleExport = async () => {
    if (!imageOverlayConfig.data) return;
    setExporting(true);
    try {
      const blob = await recompressDataUrl(
        imageOverlayConfig.data,
        canvasWidth,
        canvasHeight,
        format,
        format === 'png' ? undefined : quality / 100,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const base = projectName ? `fragment-image-${projectName}` : 'fragment-image';
      link.download = `${base}.${FILE_EXTENSIONS[format]}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Section title="Image" borderless>
      {!hasImage ? (
        <p className="text-xs text-white/40">No image overlay configured. Add an image in the Create panel to export it.</p>
      ) : (
        <>
          <p className="text-xs text-white/40 mb-3">
            Exports the overlay image resized for your canvas ({canvasWidth}&times;{canvasHeight}). Use this alongside the exported JSON config.
          </p>

          <div className="mb-3">
            <label className="block text-sm text-white/60 mb-2">Format</label>
            <RadioSelector
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'WebP', value: 'webp' },
              ]}
              value={format}
              onChange={setFormat}
              disabled={exporting}
            />
          </div>

          {format !== 'png' && (
            <div className="mb-3">
              <Slider
                label="Quality"
                value={quality}
                onChange={setQuality}
                min={10}
                max={100}
                unit="%"
              />
            </div>
          )}

          <Button onClick={handleExport} disabled={exporting} fullWidth icon={<ImageIcon className="w-4 h-4" />}>
            {exporting ? 'Exporting...' : 'Export Image'}
          </Button>
        </>
      )}
    </Section>
  );
}

interface ConfigPanelProps {
  actions: FragmentActions;
  allowCropping: boolean;
  validCellSizes: number[];
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function ConfigPanel({ actions, allowCropping, validCellSizes, fileInputRef }: ConfigPanelProps) {
  const isBlocked = !allowCropping && validCellSizes.length === 0;
  return (
    <Section title="Configuration" borderless>
      <Button onClick={actions.exportSettingsAsJson} disabled={isBlocked} className="flex-1" fullWidth icon={<FileJson className="w-4 h-4" />} data-action="export-json">
        Export JSON
      </Button>
      <Button fullWidth onClick={() => fileInputRef.current?.click()} className="flex-1" icon={<Upload className="w-4 h-4" />}>
        Import JSON
      </Button>
      <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={actions.importSettingsFromJson} className="hidden" />
    </Section>
  );
}
