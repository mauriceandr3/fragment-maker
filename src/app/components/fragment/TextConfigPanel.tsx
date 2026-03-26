import { useMemo } from "react";
import type { TextConfig, HorizontalAlignment, VerticalAlignment, FontResolution, GeneratorParams } from "./types";
import { RESOLUTION_MIN_HEIGHT } from "./types";
import { generateTextGrid, type FontData } from "@/implementation-files/generateTextGrid";
import { FONTS } from "@/lib/bitmapFonts";
import { Slider } from "../ui/Slider";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Checkbox } from "../ui/Checkbox";
import { Section } from '../ui/Section';
import { ParametersPanel } from "./ParametersPanel";

const fonts: FontData = FONTS;

interface TextConfigPanelProps {
  config: TextConfig;
  setConfig: (config: TextConfig) => void;
  title?: string;
  cols: number;
  rows: number;
  patternEnabled?: boolean;
  onPatternEnabledChange?: (enabled: boolean) => void;
  patternParams?: GeneratorParams;
  onPatternParamsChange?: (params: GeneratorParams) => void;
  onRandomizePattern?: () => void;
}

const MAX_TEXT_LENGTH = 500;

export function TextConfigPanel({ config, setConfig, title = "Text", cols, rows, patternEnabled, onPatternEnabledChange, patternParams, onPatternParamsChange, onRandomizePattern }: TextConfigPanelProps) {
  const handleTextChange = (text: string) => {
    const limitedText = text.slice(0, MAX_TEXT_LENGTH);
    setConfig({ ...config, text: limitedText });
  };

  const fontHeight = RESOLUTION_MIN_HEIGHT[config.fontResolution];
  const maxCharHeight = fontHeight * Math.max(1, Math.floor(rows / fontHeight));

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
    <Section title={title}>

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

      {/* Font Resolution */}
      <ButtonGroup<FontResolution>
        label="Resolution"
        value={config.fontResolution}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'mid', label: 'Mid' },
          { value: 'high', label: 'High' },
        ]}
        columns={3}
        onChange={(res) => {
          const newFontHeight = RESOLUTION_MIN_HEIGHT[res];
          const newMaxScale = Math.max(1, Math.floor(rows / newFontHeight));
          const scale = Math.max(1, Math.min(newMaxScale, Math.round(config.charHeight / newFontHeight)));
          setConfig({ ...config, fontResolution: res, charHeight: newFontHeight * scale });
        }}
      />

      {/* Character Height Slider */}
      <Slider
        label={`Character Height: ${config.charHeight} cells`}
        value={config.charHeight}
        min={fontHeight}
        max={maxCharHeight}
        step={fontHeight}
        onChange={(v) => {
          const scale = Math.max(1, Math.round(v / fontHeight));
          setConfig({ ...config, charHeight: fontHeight * scale });
        }}
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
        columns={3}
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
        columns={3}
        onChange={(v) => setConfig({ ...config, verticalAlignment: v })}
      />

      <Checkbox
        label="Word Wrap"
        checked={config.wordWrap}
        onChange={(checked) => setConfig({ ...config, wordWrap: checked })}
      />

      <Checkbox
        label="Invert"
        description="Text as negative space"
        checked={config.invert}
        onChange={(checked) => setConfig({ ...config, invert: checked })}
      />

      {/* Pattern Overlay */}
      {onPatternEnabledChange && (
        <Checkbox
          label="Add Pattern"
          description="Overlay pattern cells on text"
          checked={patternEnabled ?? false}
          onChange={onPatternEnabledChange}
        />
      )}

      {patternEnabled && patternParams && onPatternParamsChange && (
        <ParametersPanel
          params={patternParams}
          setParams={onPatternParamsChange}
          title="Pattern Overlay"
          onRandomize={onRandomizePattern}
        />
      )}

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
    </Section>
  );
}
