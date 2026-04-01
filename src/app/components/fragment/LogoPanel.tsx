import { Plus, Trash2 } from 'lucide-react';
import type { FragmentState } from "@/hooks/useFragmentState";
import { getLogoSvgById, LOGO_DEFINITIONS, LOGO_IDS } from "@/lib/logoRegistry";
import { getColorRgb } from "@/lib/colorUtils";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { ColorInput } from '../ui/ColorInput';
import { Slider } from '../ui/Slider';
import type { LogoEntry, LogoColorSource } from './types';
import { DEFAULT_LOGO_ENTRY } from './types';
import { resolveLogoEntryColor } from '@/lib/resolveLogoColor';

const MAX_ENTRIES = 3;

interface LogoPanelProps {
  state: FragmentState;
  /** When true, only show the color picker (no position, size, enable/disable, or custom color). */
  colorOnly?: boolean;
}

export function LogoPanel({ state, colorOnly }: LogoPanelProps) {
  const { logoConfig, setLogoConfig, colorMode, multiColors, foregroundColor } = state;

  const updateConfig = (patch: Partial<typeof logoConfig>) => {
    setLogoConfig({ ...logoConfig, ...patch });
  };

  const updateEntry = (id: string, patch: Partial<LogoEntry>) => {
    updateConfig({
      entries: logoConfig.entries.map(e =>
        e.id === id ? { ...e, ...patch } : e
      ),
    });
  };

  const addEntry = () => {
    if (logoConfig.entries.length >= MAX_ENTRIES) return;
    updateConfig({
      entries: [
        ...logoConfig.entries,
        { ...DEFAULT_LOGO_ENTRY, id: crypto.randomUUID() },
      ],
    });
  };

  const removeEntry = (id: string) => {
    updateConfig({
      entries: logoConfig.entries.filter(e => e.id !== id),
    });
  };

  if (colorOnly) {
    // In preset mode: show only color pickers for each entry
    return (
      <Section title="Logo" borderless>
        {logoConfig.entries.map((entry, idx) => {
          const def = LOGO_DEFINITIONS[entry.logoId];
          if (!def.supportsColorChange) return null;
          return (
            <div key={entry.id} className="space-y-2">
              {logoConfig.entries.length > 1 && (
                <span className="text-xs text-white/40 uppercase tracking-wider">Logo {idx + 1}</span>
              )}
              <LogoPreview entry={entry} colorMode={colorMode} multiColors={multiColors} foregroundColor={foregroundColor} />
              <ColorPicker
                entry={entry}
                colorMode={colorMode}
                multiColors={multiColors}
                foregroundColor={foregroundColor}
                hideCustom
                onUpdate={(patch) => updateEntry(entry.id, patch)}
              />
            </div>
          );
        })}
      </Section>
    );
  }

  return (
    <Section title="Logo" borderless>
      <Checkbox
        label="Show logos"
        checked={logoConfig.enabled}
        onChange={(checked) => updateConfig({ enabled: checked })}
      />

      {logoConfig.enabled && (
        <>
          {logoConfig.entries.map((entry, idx) => (
            <LogoEntryEditor
              key={entry.id}
              entry={entry}
              index={idx}

              colorMode={colorMode}
              multiColors={multiColors}
              foregroundColor={foregroundColor}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}

          {logoConfig.entries.length < MAX_ENTRIES && (
            <button
              onClick={addEntry}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add logo
            </button>
          )}
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LogoEntryEditorProps {
  entry: LogoEntry;
  index: number;
  colorMode: string;
  multiColors: string[];
  foregroundColor: string;
  onUpdate: (patch: Partial<LogoEntry>) => void;
  onRemove: () => void;
}

function LogoEntryEditor({ entry, index, colorMode, multiColors, foregroundColor, onUpdate, onRemove }: LogoEntryEditorProps) {
  const def = LOGO_DEFINITIONS[entry.logoId];

  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wider">Logo {index + 1}</span>
        <button
          onClick={onRemove}
          className="p-1 text-white/30 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Logo type selector */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Type</label>
        <div className="flex gap-1">
          {LOGO_IDS.map(id => {
            const logoDef = LOGO_DEFINITIONS[id];
            return (
              <button
                key={id}
                onClick={() => onUpdate({ logoId: id })}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-colors ${
                  entry.logoId === id
                    ? 'bg-white/20 text-white border border-white/40'
                    : 'bg-black/30 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/40'
                }`}
              >
                {logoDef.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logo preview */}
      <LogoPreview entry={entry} colorMode={colorMode} multiColors={multiColors} foregroundColor={foregroundColor} />

      {/* Size */}
      <Slider
        label="Size"
        value={entry.size}
        onChange={(v) => onUpdate({ size: v })}
        min={5}
        max={50}
        unit="%"
      />

      {/* Position */}
      <Slider
        label="X Position"
        value={entry.x}
        onChange={(v) => onUpdate({ x: v })}
        min={0}
        max={100}
        unit="%"
      />
      <Slider
        label="Y Position"
        value={entry.y}
        onChange={(v) => onUpdate({ y: v })}
        min={0}
        max={100}
        unit="%"
      />

      {/* Color picker — only for recolorable logos */}
      {def.supportsColorChange && (
        <ColorPicker
          entry={entry}
          colorMode={colorMode}
          multiColors={multiColors}
          foregroundColor={foregroundColor}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function LogoPreview({ entry, colorMode, multiColors, foregroundColor }: {
  entry: LogoEntry;
  colorMode: string;
  multiColors: string[];
  foregroundColor: string;
}) {
  const effectiveColor = resolveLogoEntryColor(entry, colorMode as 'mono' | 'duo' | 'tri' | 'quad', multiColors, foregroundColor);
  const svgHtml = getLogoSvgById(entry.logoId, effectiveColor ?? undefined);

  return (
    <div className="flex justify-center py-2">
      <div
        className="w-32 opacity-80"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
}

function ColorPicker({ entry, colorMode, multiColors, foregroundColor, hideCustom, onUpdate }: {
  entry: LogoEntry;
  colorMode: string;
  multiColors: string[];
  foregroundColor: string;
  hideCustom?: boolean;
  onUpdate: (patch: Partial<LogoEntry>) => void;
}) {
  const primaryColors: { source: LogoColorSource; color: string; label: string }[] = [];
  if (colorMode === 'mono') {
    primaryColors.push({ source: 'color1', color: getColorRgb(foregroundColor), label: 'Foreground' });
  } else {
    const count = colorMode === 'quad' ? 4 : colorMode === 'tri' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      primaryColors.push({
        source: `color${i + 1}` as LogoColorSource,
        color: getColorRgb(multiColors[i] ?? '#FCFCFC'),
        label: `Color ${i + 1}`,
      });
    }
  }

  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">Logo Color</label>
      <div className="flex gap-2 mb-2">
        {primaryColors.map(({ source, color, label }) => {
          const isActive = entry.colorSource === source;
          return (
            <button
              key={source}
              onClick={() => onUpdate({ colorSource: source })}
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
        {!hideCustom && (
          <button
            onClick={() => onUpdate({ colorSource: 'custom' })}
            className={`w-10 h-10 rounded-lg transition-all relative overflow-hidden ${
              entry.colorSource === 'custom'
                ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-black/80 scale-110'
                : 'border border-white/20 hover:border-white/40'
            }`}
            style={{ backgroundColor: entry.color }}
            title="Custom color"
          >
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white mix-blend-difference">
              ...
            </span>
          </button>
        )}
      </div>
      {!hideCustom && entry.colorSource === 'custom' && (
        <ColorInput
          value={getColorRgb(entry.color)}
          displayValue={entry.color}
          onColorChange={(color) => onUpdate({ color })}
          onTextChange={(color) => onUpdate({ color })}
        />
      )}
    </div>
  );
}
