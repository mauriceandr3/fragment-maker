import type { FragmentState } from "@/hooks/useFragmentState";
import type { LogoPosition } from "./types";
import { getLogoSvg } from "@/lib/dfinityLogo";
import { getColorRgb } from "@/lib/colorUtils";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ButtonGroup } from '../ui/ButtonGroup';
import { ColorInput } from '../ui/ColorInput';
import { Slider } from '../ui/Slider';

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
              dangerouslySetInnerHTML={{ __html: getLogoSvg(logoConfig.color) }}
            />
          </div>

          {/* Position */}
          <ButtonGroup
            label="Position"
            value={logoConfig.position}
            options={POSITIONS}
            columns={4}
            onChange={(value) => update({ position: value })}
          />

          {/* Size */}
          <Slider
            label="Size"
            value={logoConfig.size}
            onChange={(v) => update({ size: v })}
            min={5}
            max={50}
            unit="%"
          />

          {/* Padding */}
          <Slider
            label="Horizontal Padding"
            value={logoConfig.paddingX}
            onChange={(v) => update({ paddingX: v })}
            min={0}
            max={20}
            unit="%"
          />
          <Slider
            label="Vertical Padding"
            value={logoConfig.paddingY}
            onChange={(v) => update({ paddingY: v })}
            min={0}
            max={20}
            unit="%"
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
            <ColorInput
              value={getColorRgb(logoConfig.color)}
              displayValue={logoConfig.color}
              onColorChange={(color) => update({ color })}
              onTextChange={(color) => update({ color })}
            />
          </div>
        </>
      )}
    </Section>
  );
}
