import { getColorRgb, isTransparent, setColorAlpha, COLOR_PRESETS } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ColorInput } from '../ui/ColorInput';

interface ColorsPanelProps {
  state: FragmentState;
}

export function ColorsPanel({ state }: ColorsPanelProps) {
  const {
    foregroundColor, setForegroundColor,
    backgroundColor, setBackgroundColor,
    customPreset, setCustomPreset,
    invertColors, setInvertColors,
  } = state;

  return (
    <Section title="Colors">

      {/* Color Presets */}
      <div className="space-y-2">
        <label className="block text-sm text-white/60 mb-3">Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PRESETS.map((preset) => {
            const isActive = getColorRgb(foregroundColor).toUpperCase() === preset.foreground.toUpperCase() &&
                            getColorRgb(backgroundColor).toUpperCase() === preset.background.toUpperCase() &&
                            !isTransparent(foregroundColor) && !isTransparent(backgroundColor);
            return (
              <button
                key={preset.name}
                onClick={() => {
                  setForegroundColor(preset.foreground);
                  setBackgroundColor(preset.background);
                  setCustomPreset({ background: preset.background, foreground: preset.foreground });
                }}
                className={`relative py-2.5 px-3 rounded-lg text-left transition-all shadow-lg overflow-hidden group ${
                  isActive
                    ? 'border-2 border-white/40'
                    : 'border border-white/20 hover:border-white/30'
                }`}
              >
                <div className="absolute inset-0 flex">
                  <div className="w-1/2" style={{ backgroundColor: preset.background }} />
                  <div className="w-1/2" style={{ backgroundColor: preset.foreground }} />
                </div>
                <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <div className="text-xs text-white font-medium">{preset.name}</div>
                </div>
              </button>
            );
          })}

          {/* Custom Preset Button */}
          {(() => {
            const isCustomActive = getColorRgb(foregroundColor).toUpperCase() === customPreset.foreground.toUpperCase() &&
                                  getColorRgb(backgroundColor).toUpperCase() === customPreset.background.toUpperCase() &&
                                  !isTransparent(foregroundColor) && !isTransparent(backgroundColor);
            return (
              <button
                onClick={() => {
                  setForegroundColor(customPreset.foreground);
                  setBackgroundColor(customPreset.background);
                }}
                className={`relative py-2.5 px-3 rounded-lg text-left transition-all shadow-lg overflow-hidden group ${
                  isCustomActive
                    ? 'border-2 border-white/40'
                    : 'border border-white/20 hover:border-white/30'
                }`}
              >
                <div className="absolute inset-0 flex">
                  <div className="w-1/2" style={{ backgroundColor: customPreset.background }} />
                  <div className="w-1/2" style={{ backgroundColor: customPreset.foreground }} />
                </div>
                <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <div className="text-xs text-white font-medium">Custom</div>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      <div className="border-t border-white/10 my-4"></div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/60">Foreground</label>
          <Checkbox
            label="Transparent"
            size="sm"
            checked={isTransparent(foregroundColor)}
            onChange={(checked) => setForegroundColor(setColorAlpha(foregroundColor, checked ? 0 : 1))}
          />
        </div>
        <div className={`${isTransparent(foregroundColor) ? 'opacity-30 pointer-events-none' : ''}`}>
          <ColorInput
            value={getColorRgb(foregroundColor)}
            displayValue={foregroundColor}
            onColorChange={(color) => {
              setForegroundColor(color);
              setCustomPreset({ ...customPreset, foreground: color });
            }}
            onTextChange={(text) => {
              setForegroundColor(text);
              setCustomPreset({ ...customPreset, foreground: getColorRgb(text) });
            }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/60">Background</label>
          <Checkbox
            label="Transparent"
            size="sm"
            checked={isTransparent(backgroundColor)}
            onChange={(checked) => setBackgroundColor(setColorAlpha(backgroundColor, checked ? 0 : 1))}
          />
        </div>
        <div className={`${isTransparent(backgroundColor) ? 'opacity-30 pointer-events-none' : ''}`}>
          <ColorInput
            value={getColorRgb(backgroundColor)}
            displayValue={backgroundColor}
            onColorChange={(color) => {
              setBackgroundColor(color);
              setCustomPreset({ ...customPreset, background: color });
            }}
            onTextChange={(text) => {
              setBackgroundColor(text);
              setCustomPreset({ ...customPreset, background: getColorRgb(text) });
            }}
            placeholder="#000000"
          />
        </div>
      </div>

      <Checkbox
        label="Invert Colors"
        checked={invertColors}
        onChange={setInvertColors}
      />
    </Section>
  );
}
