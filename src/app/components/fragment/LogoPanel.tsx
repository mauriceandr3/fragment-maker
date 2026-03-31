import type { FragmentState } from "@/hooks/useFragmentState";
import { getLogoSvg } from "@/lib/dfinityLogo";
import { getColorRgb } from "@/lib/colorUtils";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ColorInput } from '../ui/ColorInput';
import { Slider } from '../ui/Slider';

interface LogoPanelProps {
  state: FragmentState;
}

export function LogoPanel({ state }: LogoPanelProps) {
  const { logoConfig, setLogoConfig, foregroundColor } = state;

  // Derive the effective logo color: when useForeground is on, always track foregroundColor
  const effectiveColor = logoConfig.useForeground ? getColorRgb(foregroundColor) : logoConfig.color;

  const update = (patch: Partial<typeof logoConfig>) => {
    setLogoConfig({ ...logoConfig, ...patch });
  };

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

          {/* Color */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/60">Color</label>
              <Checkbox
                label="Use foreground"
                checked={logoConfig.useForeground}
                onChange={(checked) => update({
                  useForeground: checked,
                  ...(checked ? { color: getColorRgb(foregroundColor) } : {}),
                })}
              />
            </div>
            {!logoConfig.useForeground && (
              <ColorInput
                value={getColorRgb(logoConfig.color)}
                displayValue={logoConfig.color}
                onColorChange={(color) => update({ color })}
                onTextChange={(color) => update({ color })}
              />
            )}
          </div>
        </>
      )}
    </Section>
  );
}
