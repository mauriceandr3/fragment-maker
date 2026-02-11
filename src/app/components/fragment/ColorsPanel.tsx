import { getColorRgb, isTransparent, setColorAlpha, COLOR_PRESETS } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";

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
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Colors</h2>

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
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={isTransparent(foregroundColor)}
              onChange={(e) => setForegroundColor(setColorAlpha(foregroundColor, e.target.checked ? 0 : 1))}
              className="w-4 h-4 rounded cursor-pointer accent-white"
            />
            <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">Transparent</span>
          </label>
        </div>
        <div className={`flex gap-2 ${isTransparent(foregroundColor) ? 'opacity-30 pointer-events-none' : ''}`}>
          <input
            type="color"
            value={getColorRgb(foregroundColor)}
            onChange={(e) => {
              setForegroundColor(e.target.value);
              setCustomPreset({ ...customPreset, foreground: e.target.value });
            }}
            className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
          />
          <input
            type="text"
            value={foregroundColor}
            onChange={(e) => {
              setForegroundColor(e.target.value);
              setCustomPreset({ ...customPreset, foreground: getColorRgb(e.target.value) });
            }}
            className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
            placeholder="#FCFCFC"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/60">Background</label>
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={isTransparent(backgroundColor)}
              onChange={(e) => setBackgroundColor(setColorAlpha(backgroundColor, e.target.checked ? 0 : 1))}
              className="w-4 h-4 rounded cursor-pointer accent-white"
            />
            <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">Transparent</span>
          </label>
        </div>
        <div className={`flex gap-2 ${isTransparent(backgroundColor) ? 'opacity-30 pointer-events-none' : ''}`}>
          <input
            type="color"
            value={getColorRgb(backgroundColor)}
            onChange={(e) => {
              setBackgroundColor(e.target.value);
              setCustomPreset({ ...customPreset, background: e.target.value });
            }}
            className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
          />
          <input
            type="text"
            value={backgroundColor}
            onChange={(e) => {
              setBackgroundColor(e.target.value);
              setCustomPreset({ ...customPreset, background: getColorRgb(e.target.value) });
            }}
            className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Invert Colors Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={invertColors}
          onChange={(e) => setInvertColors(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Invert Colors</span>
      </label>
    </div>
  );
}
