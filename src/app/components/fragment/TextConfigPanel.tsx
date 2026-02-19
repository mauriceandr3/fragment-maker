import { useMemo } from "react";
import type { TextConfig, HorizontalAlignment, VerticalAlignment } from "./types";
import { generateTextGrid, type FontData } from "@/implementation-files/generateTextGrid";
import { FONTS } from "@/lib/bitmapFonts";

const fonts: FontData = FONTS;

interface TextConfigPanelProps {
  config: TextConfig;
  setConfig: (config: TextConfig) => void;
  title?: string;
  cols: number;
  rows: number;
}

const MAX_TEXT_LENGTH = 500;

function ParamSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%, rgba(255, 255, 255, 0.2) 100%)`,
        }}
      />
    </div>
  );
}

function ButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-3">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
              value === option.value
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextConfigPanel({ config, setConfig, title = "Text", cols, rows }: TextConfigPanelProps) {
  const handleTextChange = (text: string) => {
    // Enforce 500-character limit
    const limitedText = text.slice(0, MAX_TEXT_LENGTH);
    setConfig({ ...config, text: limitedText });
  };

  // Compute validation by running generateTextGrid
  const validation = useMemo(() => {
    const result = generateTextGrid(config, cols, rows, fonts);
    return {
      gridTooSmall: result.gridTooSmall,
      unsupportedChars: result.unsupportedChars,
      totalLines: result.totalLines,
      visibleLines: result.visibleLines,
      isTruncated: result.totalLines > result.visibleLines && result.totalLines > 0,
    };
  }, [config, cols, rows]);

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>

      {/* Text Input */}
      <div>
        <label className="block text-sm text-white/60 mb-2">
          Text ({config.text.length}/{MAX_TEXT_LENGTH})
        </label>
        <textarea
          value={config.text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter text to render..."
          rows={4}
          maxLength={MAX_TEXT_LENGTH}
          className="w-full bg-black/30 border border-white/20 rounded-lg p-3 text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/40 transition-colors"
        />
      </div>

      {/* Character Height Slider */}
      <ParamSlider
        label={`Character Height: ${config.charHeight}px`}
        value={config.charHeight}
        min={5}
        max={100}
        step={1}
        onChange={(v) => setConfig({ ...config, charHeight: Math.round(v) })}
      />

      {/* Horizontal Alignment */}
      <ButtonGroup<HorizontalAlignment>
        label="Horizontal Alignment"
        value={config.alignment}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
        onChange={(v) => setConfig({ ...config, alignment: v })}
      />

      {/* Vertical Alignment */}
      <ButtonGroup<VerticalAlignment>
        label="Vertical Alignment"
        value={config.verticalAlignment}
        options={[
          { value: 'top', label: 'Top' },
          { value: 'center', label: 'Center' },
          { value: 'bottom', label: 'Bottom' },
        ]}
        onChange={(v) => setConfig({ ...config, verticalAlignment: v })}
      />

      {/* Word Wrap Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={config.wordWrap}
          onChange={(e) => setConfig({ ...config, wordWrap: e.target.checked })}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Word Wrap</span>
      </label>

      {/* Invert Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={config.invert}
          onChange={(e) => setConfig({ ...config, invert: e.target.checked })}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <div className="flex flex-col">
          <span className="text-sm text-white/60 group-hover:text-white transition-colors">Invert</span>
          <span className="text-xs text-white/40">Text as negative space</span>
        </div>
      </label>

      {/* Validation Messages */}
      {(validation.gridTooSmall || validation.isTruncated || validation.unsupportedChars.length > 0) && (
        <div className="space-y-2 pt-2">
          {validation.gridTooSmall && (
            <div className="text-xs text-amber-400/90 bg-amber-400/10 rounded-lg px-3 py-2">
              Grid too small for this character size.
            </div>
          )}
          {validation.isTruncated && (
            <div className="text-xs text-amber-400/90 bg-amber-400/10 rounded-lg px-3 py-2">
              Text truncated: {validation.visibleLines} of {validation.totalLines} lines visible.
            </div>
          )}
          {validation.unsupportedChars.length > 0 && (
            <div className="text-xs text-amber-400/90 bg-amber-400/10 rounded-lg px-3 py-2">
              Unsupported characters: {validation.unsupportedChars.join(' ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
