import { useState } from 'react';
import { Film, X } from 'lucide-react';
import type { useVideoExport } from '@/hooks/useVideoExport';
import type { LogoConfig } from './types';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { RadioSelector } from '../ui/RadioSelector';

type VideoExport = ReturnType<typeof useVideoExport>;

interface VideoExportPanelProps {
  videoExport: VideoExport;
  diffSvg?: string;
  canvasWidth: number;
  canvasHeight: number;
  animationDuration: number;
  animationEnabled: boolean;
  logoConfig: LogoConfig;
}

const HOLD_MIN = 0;
const HOLD_MAX = 5;
const HOLD_STEP = 0.1;

function HoldInput({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState(String(value));

  const handleChange = (raw: string) => {
    setInputValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= HOLD_MIN && parsed <= HOLD_MAX) {
      onChange(Math.round(parsed * 10) / 10);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < HOLD_MIN || parsed > HOLD_MAX) {
      setInputValue(String(value));
    } else {
      setInputValue(String(Math.round(parsed * 10) / 10));
    }
  };

  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <label className="block text-sm text-white/60 mb-1">{label}</label>
      <input
        type="number"
        min={HOLD_MIN}
        max={HOLD_MAX}
        step={HOLD_STEP}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="w-full bg-black/30 border border-white/20 focus:border-white/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm"
      />
      <p className="text-xs text-white/40 mt-1">{description}</p>
    </div>
  );
}

export function VideoExportPanel({
  videoExport,
  diffSvg,
  canvasWidth,
  canvasHeight,
  animationDuration,
  animationEnabled,
  logoConfig,
}: VideoExportPanelProps) {
  const [mode, setMode] = useState<'one-way' | 'loop'>('one-way');
  const [startHoldSeconds, setStartHoldSeconds] = useState(0.0);
  const [middleHoldSeconds, setMiddleHoldSeconds] = useState(0.5);
  const [endHoldSeconds, setEndHoldSeconds] = useState(0.5);
  const [resolutionScale, setResolutionScale] = useState<1 | 2 | 3 | 4>(1);
  const [fps, setFps] = useState<30 | 60>(60);

  const videoStatus = videoExport.state.status;
  const isExporting = videoStatus !== 'idle' && videoStatus !== 'error';
  const isInteractive = animationEnabled && !!diffSvg && videoExport.isSupported;

  const handleExportVideo = () => {
    if (!isInteractive) return;
    videoExport.startExport({
      diffSvg: diffSvg!,
      canvasWidth,
      canvasHeight,
      durationMs: animationDuration,
      mode,
      startHoldMs: Math.round(startHoldSeconds * 1000),
      middleHoldMs: Math.round(middleHoldSeconds * 1000),
      endHoldMs: Math.round(endHoldSeconds * 1000),
      resolutionScale,
      fps,
      logoConfig,
    });
  };

  const endHoldDescription = mode === 'loop'
    ? 'Pause on start state before video ends · seamless when looped'
    : 'Pause on end state before video ends';

  return (
    <Section title="Video" borderless>

      {!animationEnabled ? (
        <p className="text-xs text-white/40">
          Enable animation to export video.
        </p>
      ) : (
      <div>

        {/* Mode */}
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-2">Mode</label>
          <RadioSelector
            options={[
              { label: 'One-way', value: 'one-way' },
              { label: 'Loop', value: 'loop' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <p className="text-xs text-white/40 mt-1">
            {mode === 'one-way'
              ? 'Animates to end state and stops'
              : 'Animates forward then reverses (pingpong)'}
          </p>
        </div>

        {/* Hold settings */}
        <div className="space-y-3 mb-4">
          <HoldInput
            label="Start Hold (s)"
            description="Pause on start frame before animation begins"
            value={startHoldSeconds}
            onChange={setStartHoldSeconds}
          />
          <HoldInput
            label="Middle Hold (s)"
            description="Pause on end state before reversing"
            value={middleHoldSeconds}
            onChange={setMiddleHoldSeconds}
            disabled={mode === 'one-way'}
          />
          <HoldInput
            label="End Hold (s)"
            description={endHoldDescription}
            value={endHoldSeconds}
            onChange={setEndHoldSeconds}
          />
        </div>

        {/* Resolution */}
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

        {/* FPS */}
        <div className="mb-4">
          <label className="block text-sm text-white/60 mb-2">FPS</label>
          <RadioSelector
            options={[
              { label: '30', value: '30' },
              { label: '60', value: '60' },
            ]}
            value={String(fps)}
            onChange={(v) => setFps(Number(v) as 30 | 60)}
          />
          <p className="text-xs text-white/40 mt-1">
            30fps halves file size with minimal visible difference
          </p>
        </div>

        {/* Export button / progress */}
        {isExporting ? (
          <div className="relative w-full bg-black/30 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden shadow-lg">
            <div
              className="absolute inset-0 bg-white/10 transition-all duration-150"
              style={{ width: `${Math.round(videoExport.state.progress * 100)}%` }}
            />
            <div className="relative flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-white/70 animate-pulse" />
                <span className="text-sm text-white/70">
                  {videoStatus === 'preparing' && 'Preparing...'}
                  {videoStatus === 'recording' && `Exporting ${Math.round(videoExport.state.progress * 100)}%`}
                  {videoStatus === 'finalizing' && 'Finalizing...'}
                </span>
              </div>
              <Button
                variant="icon"
                size="sm"
                onClick={videoExport.cancelExport}
                className="border-0 bg-transparent hover:bg-white/10 text-white/50 hover:text-white shadow-none hover:shadow-none"
                icon={<X className="w-4 h-4" />}
              />
            </div>
          </div>
        ) : (
          <Button
            onClick={handleExportVideo}
            fullWidth
            icon={<Film className="w-4 h-4" />}
          >
            Export Video
          </Button>
        )}

        {/* Error display */}
        {videoExport.state.status === 'error' && videoExport.state.error && (
          <div className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl py-2 px-4">
            <span className="text-sm text-red-300">{videoExport.state.error}</span>
          </div>
        )}
      </div>
      )}
    </Section>
  );
}
