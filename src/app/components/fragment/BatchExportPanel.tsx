import { useState } from 'react';
import { Package, X } from 'lucide-react';
import type { useBatchExport, BatchExportOptions } from '@/hooks/useBatchExport';
import type { GeneratorParams, LogoConfig, StateType } from './types';
import type { CropDirection } from '@/implementation-files/generateFragmentSvg';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { RadioSelector } from '../ui/RadioSelector';

type BatchExport = ReturnType<typeof useBatchExport>;

interface BatchExportPanelProps {
  batchExport: BatchExport;
  params: GeneratorParams;
  foregroundColor: string;
  backgroundColor: string;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  allowCropping: boolean;
  cropDirection: CropDirection;
  fromStateType: StateType;
  logoConfig: LogoConfig;
  animationEnabled: boolean;
}

export function BatchExportPanel({
  batchExport,
  params,
  foregroundColor,
  backgroundColor,
  cellSize,
  canvasWidth,
  canvasHeight,
  allowCropping,
  cropDirection,
  fromStateType,
  logoConfig,
  animationEnabled,
}: BatchExportPanelProps) {
  const [count, setCount] = useState(20);
  const [format, setFormat] = useState<'svg' | 'png'>('svg');
  const [resolutionScale, setResolutionScale] = useState<1 | 2 | 3 | 4>(1);
  const [countInput, setCountInput] = useState('20');

  const batchStatus = batchExport.state.status;
  const isExporting = batchStatus === 'generating' || batchStatus === 'zipping';

  const handleCountChange = (raw: string) => {
    setCountInput(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      setCount(parsed);
    }
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
      count,
      format,
      resolutionScale,
      params,
      foregroundColor,
      backgroundColor,
      cellSize,
      canvasWidth,
      canvasHeight,
      allowCropping,
      cropDirection,
      fromStateType,
      logoConfig,
    };
    batchExport.startExport(opts);
  };

  return (
    <Section title="Batch" borderless>
      <p className="text-xs text-white/40 mb-4">
        Generates multiple variations by randomizing the seed. All other parameters stay the same.
      </p>
      {/* Count */}
      <div className="mb-4">
        <label className="block text-sm text-white/60 mb-1">Count</label>
        <input
          type="number"
          min={1}
          max={100}
          value={countInput}
          onChange={(e) => handleCountChange(e.target.value)}
          onBlur={handleCountBlur}
          disabled={isExporting}
          className="w-full bg-black/30 border border-white/20 focus:border-white/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm"
        />
        <p className="text-xs text-white/40 mt-1">Number of variations to generate (1–100)</p>
      </div>

      {/* Format */}
      <div className="mb-4">
        <label className="block text-sm text-white/60 mb-2">Format</label>
        <RadioSelector
          options={[
            { label: 'SVG', value: 'svg' },
            { label: 'PNG', value: 'png' },
          ]}
          value={format}
          onChange={setFormat}
        />
      </div>

      {/* Resolution (PNG only) */}
      {format === 'png' && (
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-2">
            Resolution&nbsp;
            <span className="text-white/40">
              ({canvasWidth * resolutionScale} × {canvasHeight * resolutionScale}px)
            </span>
          </label>
          <RadioSelector
            options={[
              { label: '1×', value: '1' },
              { label: '2×', value: '2' },
              { label: '3×', value: '3' },
              { label: '4×', value: '4' },
            ]}
            value={String(resolutionScale)}
            onChange={(v) => setResolutionScale(Number(v) as 1 | 2 | 3 | 4)}
          />
        </div>
      )}

      {/* Warnings */}
      {fromStateType === 'text' && (
        <p className="text-xs text-amber-300/70 mb-3">
          Text state produces identical patterns. Batch will export {count} copies of the same design.
        </p>
      )}
      {animationEnabled && (
        <p className="text-xs text-white/40 mb-3">
          Batch export uses the &quot;From&quot; state only (static frames).
        </p>
      )}

      {/* Export button / Progress */}
      {isExporting ? (
        <div className="relative w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-lg">
          <div
            className="absolute inset-0 bg-white/10 transition-all duration-150"
            style={{ width: `${Math.round(batchExport.state.progress * 100)}%` }}
          />
          <div className="relative flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-white/70 animate-pulse" />
              <span className="text-sm text-white/70">
                {batchStatus === 'generating' &&
                  `Generating ${batchExport.state.currentItem}/${batchExport.state.totalItems}`}
                {batchStatus === 'zipping' && 'Creating ZIP...'}
              </span>
            </div>
            <Button
              variant="icon"
              size="sm"
              onClick={batchExport.cancelExport}
              className="border-0 bg-transparent hover:bg-white/10 text-white/50 hover:text-white shadow-none hover:shadow-none"
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>
      ) : (
        <Button
          onClick={handleExport}
          disabled={isExporting}
          fullWidth
          icon={<Package className="w-4 h-4" />}
        >
          Export {count} Variations
        </Button>
      )}

      {/* Error */}
      {batchExport.state.status === 'error' && batchExport.state.error && (
        <div className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl py-2 px-4 mt-2">
          <span className="text-sm text-red-300">{batchExport.state.error}</span>
        </div>
      )}
    </Section>
  );
}
