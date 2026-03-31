import type { FragmentState } from "@/hooks/useFragmentState";
import { getLogoSvg } from "@/lib/dfinityLogo";
import { getColorRgb } from "@/lib/colorUtils";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ColorInput } from '../ui/ColorInput';
import { Slider } from '../ui/Slider';
import type { LogoColorSource } from './types';
import { resolveLogoColor } from '@/lib/resolveLogoColor';

interface LogoPanelProps {
  state: FragmentState;
  /** When true, only show the color picker (no position, size, enable/disable, or custom color). */
  colorOnly?: boolean;
}

export function LogoPanel({ state, colorOnly }: LogoPanelProps) {
  const { logoConfig, setLogoConfig, colorMode, multiColors, foregroundColor } = state;

  const effectiveColor = resolveLogoColor(logoConfig, colorMode, multiColors, foregroundColor);

  const update = (patch: Partial<typeof logoConfig>) => {
    setLogoConfig({ ...logoConfig, ...patch });
  };

  // Build the list of primary color options based on color mode
  const primaryColors: { source: LogoColorSource; color: string; label: string }[] = [];
  if (colorMode === 'mono') {
    primaryColors.push({ source: 'color1', color: getColorRgb(foregroundColor), label: 'Foreground' });
  } else {
    const count = colorMode === 'tri' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      primaryColors.push({
        source: `color${i + 1}` as LogoColorSource,
        color: getColorRgb(multiColors[i] ?? '#FCFCFC'),
        label: `Color ${i + 1}`,
      });
    }
  }

  const colorPicker = (
    <div>
      <label className="block text-sm text-white/60 mb-2">Logo Color</label>
      <div className="flex gap-2 mb-2">
        {primaryColors.map(({ source, color, label }) => {
          const isActive = logoConfig.colorSource === source;
          return (
            <button
              key={source}
              onClick={() => update({ colorSource: source })}
              className={`w-10 h-10 rounded-lg transition-all ${
                isActive
                  ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black/80 scale-110'
                  : 'border border-white/20 hover:border-white/40'
              }`}
              style={{ backgroundColor: color }}
              title={label}
            />
          );
        })}
        {!colorOnly && (
          /* Custom color swatch */
          <button
            onClick={() => update({ colorSource: 'custom' })}
            className={`w-10 h-10 rounded-lg transition-all relative overflow-hidden ${
              logoConfig.colorSource === 'custom'
                ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black/80 scale-110'
                : 'border border-white/20 hover:border-white/40'
            }`}
            style={{ backgroundColor: logoConfig.color }}
            title="Custom color"
          >
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white mix-blend-difference">
              …
            </span>
          </button>
        )}
      </div>
      {!colorOnly && logoConfig.colorSource === 'custom' && (
        <ColorInput
          value={getColorRgb(logoConfig.color)}
          displayValue={logoConfig.color}
          onColorChange={(color) => update({ color })}
          onTextChange={(color) => update({ color })}
        />
      )}
    </div>
  );

  if (colorOnly) {
    return (
      <Section title="Logo" borderless>
        {/* Logo preview */}
        <div className="flex justify-center py-2">
          <div
            className="w-32 opacity-80"
            dangerouslySetInnerHTML={{ __html: getLogoSvg(effectiveColor) }}
          />
        </div>
        {colorPicker}
      </Section>
    );
  }

  return (
    <Section title="Logo" borderless>

      <Checkbox
        label="Show logo"
        checked={logoConfig.enabled}
        onChange={(checked) => update({ enabled: checked })}
      />

      {logoConfig.enabled && (
        <>
          {/* Logo preview */}
          <div className="flex justify-center py-2">
            <div
              className="w-32 opacity-80"
              dangerouslySetInnerHTML={{ __html: getLogoSvg(effectiveColor) }}
            />
          </div>

          {/* Size */}
          <Slider
            label="Size"
            value={logoConfig.size}
            onChange={(v) => update({ size: v })}
            min={5}
            max={50}
            unit="%"
          />

          {/* Position */}
          <Slider
            label="X Position"
            value={logoConfig.x}
            onChange={(v) => update({ x: v })}
            min={0}
            max={100}
            unit="%"
          />
          <Slider
            label="Y Position"
            value={logoConfig.y}
            onChange={(v) => update({ y: v })}
            min={0}
            max={100}
            unit="%"
          />

          {colorPicker}
        </>
      )}
    </Section>
  );
}
