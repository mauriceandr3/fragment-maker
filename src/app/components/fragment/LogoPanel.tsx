import type { FragmentState } from "@/hooks/useFragmentState";
import type { LogoPosition } from "./types";
import { PercentSlider } from "./PercentSlider";
import { getLogoSvg } from "@/lib/dfinityLogo";
import { getColorRgb } from "@/lib/colorUtils";
import { Section } from '../ui/Section';

interface LogoPanelProps {
  state: FragmentState;
}

const POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: 'top-left', label: 'TL' },
  { value: 'top-right', label: 'TR' },
  { value: 'bottom-left', label: 'BL' },
  { value: 'bottom-right', label: 'BR' },
];

export function LogoPanel({ state }: LogoPanelProps) {
  const { logoConfig, setLogoConfig, foregroundColor } = state;

  const update = (patch: Partial<typeof logoConfig>) => {
    setLogoConfig({ ...logoConfig, ...patch });
  };

  return (
    <Section title="Logo">

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={logoConfig.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">
          Show logo
        </span>
      </label>

      {logoConfig.enabled && (
        <>
          {/* Logo preview */}
          <div className="flex justify-center py-2">
            <div
              className="w-32 opacity-80"
              dangerouslySetInnerHTML={{ __html: getLogoSvg(logoConfig.color) }}
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Position</label>
            <div className="grid grid-cols-4 gap-1.5">
              {POSITIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ position: value })}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                    logoConfig.position === value
                      ? 'bg-white/20 border-2 border-white/40 text-white'
                      : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <PercentSlider
            label="Size"
            value={logoConfig.size}
            onChange={(v) => update({ size: v })}
            min={5}
            max={50}
          />

          {/* Padding */}
          <PercentSlider
            label="Horizontal Padding"
            value={logoConfig.paddingX}
            onChange={(v) => update({ paddingX: v })}
            min={0}
            max={20}
          />
          <PercentSlider
            label="Vertical Padding"
            value={logoConfig.paddingY}
            onChange={(v) => update({ paddingY: v })}
            min={0}
            max={20}
          />

          {/* Color */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/60">Color</label>
              <button
                onClick={() => update({ color: getColorRgb(foregroundColor) })}
                className="text-xs text-white/40 hover:text-white/80 transition-colors"
              >
                Use foreground
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="color"
                value={getColorRgb(logoConfig.color)}
                onChange={(e) => update({ color: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
              />
              <input
                type="text"
                value={logoConfig.color}
                onChange={(e) => update({ color: e.target.value })}
                className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                placeholder="#FCFCFC"
              />
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
