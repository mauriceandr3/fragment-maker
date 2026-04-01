import { getColorRgb, isTransparent, setColorAlpha, COLOR_PRESETS, DUO_COLOR_PRESETS, TRI_COLOR_PRESETS, QUAD_COLOR_PRESETS, type MultiColorPreset } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import { COLOR_MODE_COUNT, type ColorMode } from "@/implementation-files/generateFragmentSvg";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ColorInput } from '../ui/ColorInput';
import { RadioSelector } from '../ui/RadioSelector';
import { ProportionSlider } from '../ui/ProportionSlider';

const COLOR_MODE_OPTIONS: { label: string; value: ColorMode }[] = [
  { label: "Mono", value: "mono" },
  { label: "Duo", value: "duo" },
  { label: "Tri", value: "tri" },
  { label: "Quad", value: "quad" },
];

/** Fields that can be individually locked in the colors panel */
export type LockableColorField = 'colorMode' | 'presets' | 'foreground' | 'background' | 'invertColors';

interface ColorsPanelProps {
  state: FragmentState;
  /**
   * Fields to hide and lock. Locked fields are not shown.
   * Default: empty/undefined (all fields visible).
   */
  lockedFields?: ReadonlySet<LockableColorField>;
}

function MonoPresets({ state }: { state: FragmentState }) {
  const {
    foregroundColor, setForegroundColor,
    backgroundColor, setBackgroundColor,
    customPreset, setCustomPreset,
  } = state;

  return (
    <div className="grid grid-cols-2 gap-2">
      {COLOR_PRESETS.map((preset) => {
        const isActive = getColorRgb(foregroundColor).toUpperCase() === preset.foreground.toUpperCase() &&
                        getColorRgb(backgroundColor).toUpperCase() === preset.background.toUpperCase() &&
                        !isTransparent(foregroundColor) && !isTransparent(backgroundColor);
        return (
          <PresetButton
            key={preset.name}
            name={preset.name}
            colors={[preset.background, preset.foreground]}
            isActive={isActive}
            onClick={() => {
              setForegroundColor(preset.foreground);
              setBackgroundColor(preset.background);
              setCustomPreset({ background: preset.background, foreground: preset.foreground });
            }}
          />
        );
      })}

      {/* Custom Preset Button */}
      {(() => {
        const isCustomActive = getColorRgb(foregroundColor).toUpperCase() === customPreset.foreground.toUpperCase() &&
                              getColorRgb(backgroundColor).toUpperCase() === customPreset.background.toUpperCase() &&
                              !isTransparent(foregroundColor) && !isTransparent(backgroundColor);
        return (
          <PresetButton
            name="Custom"
            colors={[customPreset.background, customPreset.foreground]}
            isActive={isCustomActive}
            onClick={() => {
              setForegroundColor(customPreset.foreground);
              setBackgroundColor(customPreset.background);
            }}
          />
        );
      })()}
    </div>
  );
}

function MultiColorPresets({ state, presets }: { state: FragmentState; presets: MultiColorPreset[] }) {
  const {
    backgroundColor, setBackgroundColor,
    multiColors, setMultiColors,
    setColorProportions,
  } = state;

  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((preset) => {
        const isActive = preset.colors.every((c, i) => getColorRgb(multiColors[i] ?? '').toUpperCase() === c.toUpperCase()) &&
                        getColorRgb(backgroundColor).toUpperCase() === preset.background.toUpperCase();
        return (
          <PresetButton
            key={preset.name}
            name={preset.name}
            colors={[preset.background, ...preset.colors]}
            isActive={isActive}
            onClick={() => {
              setBackgroundColor(preset.background);
              setMultiColors([...preset.colors]);
              setColorProportions([...preset.proportions]);
            }}
          />
        );
      })}
    </div>
  );
}

function PresetButton({ name, colors, isActive, onClick }: {
  name: string;
  colors: string[];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative py-2.5 px-3 rounded-lg text-left transition-all shadow-lg overflow-hidden group ${
        isActive
          ? 'border-2 border-white/40'
          : 'border border-white/20 hover:border-white/30'
      }`}
    >
      <div className="absolute inset-0 flex">
        {colors.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="relative z-10 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
        <div className="text-xs text-white font-medium">{name}</div>
      </div>
    </button>
  );
}


function MultiColorControls({ state }: { state: FragmentState }) {
  const {
    colorMode,
    multiColors, setMultiColors,
    colorProportions, setColorProportions,
  } = state;

  const colorCount = COLOR_MODE_COUNT[colorMode];

  const updateColor = (index: number, color: string) => {
    const newColors = [...multiColors];
    newColors[index] = color;
    setMultiColors(newColors);
  };

  return (
    <>
      {Array.from({ length: colorCount }, (_, i) => (
        <div key={i}>
          <label className="block text-sm text-white/60 mb-2">Color {i + 1}</label>
          <ColorInput
            value={getColorRgb(multiColors[i] ?? '#FCFCFC')}
            displayValue={multiColors[i] ?? '#FCFCFC'}
            onColorChange={(color) => updateColor(i, color)}
            onTextChange={(text) => updateColor(i, text)}
          />
        </div>
      ))}

      <ProportionSlider
        colors={multiColors.slice(0, colorCount)}
        proportions={colorProportions.slice(0, colorCount)}
        onChange={setColorProportions}
      />

      <BackgroundColorControl state={state} />
    </>
  );
}

function TextColorSelector({ state }: { state: FragmentState }) {
  const { multiColors, colorMode, textColor, setTextColor } = state;

  const colorCount = COLOR_MODE_COUNT[colorMode];
  const options = multiColors.slice(0, colorCount);

  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">Text Color</label>
      <div className="flex gap-2">
        {options.map((color, i) => {
          const isActive = getColorRgb(textColor).toUpperCase() === getColorRgb(color).toUpperCase();
          return (
            <button
              key={i}
              onClick={() => setTextColor(color)}
              className={`w-10 h-10 rounded-lg transition-all ${
                isActive
                  ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black/80 scale-110'
                  : 'border border-white/20 hover:border-white/40'
              }`}
              style={{ backgroundColor: color }}
              title={`Color ${i + 1}: ${color}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function BackgroundColorControl({ state }: { state: FragmentState }) {
  const { backgroundColor, setBackgroundColor } = state;

  return (
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
          onColorChange={(color) => setBackgroundColor(color)}
          onTextChange={(text) => setBackgroundColor(text)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function ColorsPanel({ state, lockedFields }: ColorsPanelProps) {
  const { colorMode, setColorMode, setMultiColors, setColorProportions,
    fromStateType, toStateType, animationEnabled } = state;
  const hasTextState = fromStateType === 'text' || (animationEnabled && toStateType === 'text');

  const isVisible = (field: LockableColorField) => !lockedFields?.has(field);

  const handleColorModeChange = (mode: ColorMode) => {
    setColorMode(mode);
    const count = COLOR_MODE_COUNT[mode];
    // Set default colors/proportions when switching modes
    if (mode === 'duo') {
      setMultiColors(prev => prev.length >= 2 ? prev.slice(0, 2) : ['#FCFCFC', '#C2A3FF']);
      setColorProportions(prev => prev.length === 2 ? prev : [0.5, 0.5]);
    } else if (mode === 'tri') {
      setMultiColors(prev => prev.length >= 3 ? prev.slice(0, 3) : [...prev.slice(0, 2), '#6CFF80']);
      setColorProportions(prev => prev.length === 3 ? prev : [0.33, 0.34, 0.33]);
    } else if (mode === 'quad') {
      const defaults = ['#FCFCFC', '#C2A3FF', '#6CFF80', '#00F9E1'];
      setMultiColors(prev => prev.length >= count ? prev.slice(0, count) : [...prev.slice(0, Math.min(prev.length, count)), ...defaults.slice(prev.length, count)]);
      setColorProportions(prev => prev.length === count ? prev : [0.25, 0.25, 0.25, 0.25]);
    }
  };

  // Check if any custom color controls are visible
  const hasCustomControls = colorMode === 'mono'
    ? (isVisible('foreground') || isVisible('background') || isVisible('invertColors'))
    : (isVisible('foreground') || isVisible('background'));

  return (
    <Section title="Colors" borderless>
      {/* Color Mode Toggle */}
      {isVisible('colorMode') && (
        <RadioSelector
          options={COLOR_MODE_OPTIONS}
          value={colorMode}
          onChange={handleColorModeChange}
        />
      )}

      {/* Presets */}
      {isVisible('presets') && (
        <div className="space-y-2">
          <label className="block text-sm text-white/60 mb-3">Presets</label>
          {colorMode === 'mono' && <MonoPresets state={state} />}
          {colorMode === 'duo' && <MultiColorPresets state={state} presets={DUO_COLOR_PRESETS} />}
          {colorMode === 'tri' && <MultiColorPresets state={state} presets={TRI_COLOR_PRESETS} />}
          {colorMode === 'quad' && <MultiColorPresets state={state} presets={QUAD_COLOR_PRESETS} />}
        </div>
      )}

      {hasCustomControls && (
        <>
          <div className="border-t border-white/10 my-4"></div>

          {/* Color Controls */}
          {colorMode === 'mono' ? (
            <>
              {isVisible('foreground') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white/60">Foreground</label>
                    <Checkbox
                      label="Transparent"
                      size="sm"
                      checked={isTransparent(state.foregroundColor)}
                      onChange={(checked) => state.setForegroundColor(setColorAlpha(state.foregroundColor, checked ? 0 : 1))}
                    />
                  </div>
                  <div className={`${isTransparent(state.foregroundColor) ? 'opacity-30 pointer-events-none' : ''}`}>
                    <ColorInput
                      value={getColorRgb(state.foregroundColor)}
                      displayValue={state.foregroundColor}
                      onColorChange={(color) => {
                        state.setForegroundColor(color);
                        state.setCustomPreset({ ...state.customPreset, foreground: color });
                      }}
                      onTextChange={(text) => {
                        state.setForegroundColor(text);
                        state.setCustomPreset({ ...state.customPreset, foreground: getColorRgb(text) });
                      }}
                    />
                  </div>
                </div>
              )}

              {isVisible('background') && <BackgroundColorControl state={state} />}

              {isVisible('invertColors') && (
                <Checkbox
                  label="Invert Colors"
                  checked={state.invertColors}
                  onChange={state.setInvertColors}
                />
              )}
            </>
          ) : (
            isVisible('foreground') || isVisible('background') ? (
              <MultiColorControls state={state} />
            ) : null
          )}
        </>
      )}

      {/* Text Color — pick which color to use for text when in multi-color mode */}
      {colorMode !== 'mono' && hasTextState && (
        <>
          <div className="border-t border-white/10 my-4"></div>
          <TextColorSelector state={state} />
        </>
      )}
    </Section>
  );
}
