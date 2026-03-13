import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { TextOverlayEntry, TextOverlayFontWeight, TextOverlayAlignment, TextOverlayZOrder } from './types';
import { DEFAULT_TEXT_OVERLAY_ENTRY } from './types';
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { Slider } from '../ui/Slider';
import { ColorInput } from '../ui/ColorInput';
import { getColorRgb } from '@/lib/colorUtils';

const FONT_WEIGHT_OPTIONS: { label: string; value: TextOverlayFontWeight }[] = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi-Bold', value: 600 },
  { label: 'Bold', value: 700 },
];

const ALIGNMENT_OPTIONS: { label: string; value: TextOverlayAlignment }[] = [
  { label: 'L', value: 'left' },
  { label: 'C', value: 'center' },
  { label: 'R', value: 'right' },
];

const Z_ORDER_OPTIONS: { label: string; value: TextOverlayZOrder }[] = [
  { label: 'Above', value: 'above' },
  { label: 'Behind', value: 'behind' },
];

const MAX_ENTRIES = 5;

interface TextOverlayPanelProps {
  state: FragmentState;
}

export function TextOverlayPanel({ state }: TextOverlayPanelProps) {
  const { textOverlayConfig, setTextOverlayConfig, foregroundColor } = state;

  const updateConfig = (patch: Partial<typeof textOverlayConfig>) => {
    setTextOverlayConfig({ ...textOverlayConfig, ...patch });
  };

  const updateEntry = (id: string, patch: Partial<TextOverlayEntry>) => {
    updateConfig({
      entries: textOverlayConfig.entries.map(e =>
        e.id === id ? { ...e, ...patch } : e
      ),
    });
  };

  const addEntry = () => {
    if (textOverlayConfig.entries.length >= MAX_ENTRIES) return;
    updateConfig({
      entries: [
        ...textOverlayConfig.entries,
        { ...DEFAULT_TEXT_OVERLAY_ENTRY, id: crypto.randomUUID() },
      ],
    });
  };

  const removeEntry = (id: string) => {
    updateConfig({
      entries: textOverlayConfig.entries.filter(e => e.id !== id),
    });
  };

  const moveEntry = (id: string, direction: -1 | 1) => {
    const entries = [...textOverlayConfig.entries];
    const idx = entries.findIndex(e => e.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= entries.length) return;
    [entries[idx], entries[newIdx]] = [entries[newIdx], entries[idx]];
    updateConfig({ entries });
  };

  return (
    <Section title="Text Overlay" borderless>
      <Checkbox
        label="Enable text overlay"
        checked={textOverlayConfig.enabled}
        onChange={(checked) => updateConfig({ enabled: checked })}
      />

      {textOverlayConfig.enabled && (
        <>
          {textOverlayConfig.entries.map((entry, idx) => (
            <EntryEditor
              key={entry.id}
              entry={entry}
              index={idx}
              total={textOverlayConfig.entries.length}
              foregroundColor={foregroundColor}
              onUpdate={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
              onMove={(dir) => moveEntry(entry.id, dir)}
            />
          ))}

          {textOverlayConfig.entries.length < MAX_ENTRIES && (
            <button
              onClick={addEntry}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add text block
            </button>
          )}
        </>
      )}
    </Section>
  );
}

interface EntryEditorProps {
  entry: TextOverlayEntry;
  index: number;
  total: number;
  foregroundColor: string;
  onUpdate: (patch: Partial<TextOverlayEntry>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

function EntryEditor({ entry, index, total, foregroundColor, onUpdate, onRemove, onMove }: EntryEditorProps) {
  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wider">Block {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-white/30 hover:text-red-400 transition-colors ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={entry.content}
        onChange={(e) => onUpdate({ content: e.target.value.slice(0, 500) })}
        placeholder="Enter text..."
        rows={2}
        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm resize-none"
      />

      <Slider
        label="Y Position"
        value={entry.y}
        onChange={(v) => onUpdate({ y: v })}
        min={0}
        max={100}
        unit="%"
      />

      <Slider
        label="Font Size"
        value={entry.fontSize}
        onChange={(v) => onUpdate({ fontSize: Math.round(v * 10) / 10 })}
        min={1}
        max={20}
        step={0.5}
        unit="%"
      />

      <div>
        <label className="block text-sm text-white/60 mb-2">Weight</label>
        <div className="flex gap-1">
          {FONT_WEIGHT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ fontWeight: opt.value })}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-colors ${
                entry.fontWeight === opt.value
                  ? 'bg-white/20 text-white border border-white/40'
                  : 'bg-black/30 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-2">Alignment</label>
        <div className="flex gap-1">
          {ALIGNMENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ alignment: opt.value })}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-colors ${
                entry.alignment === opt.value
                  ? 'bg-white/20 text-white border border-white/40'
                  : 'bg-black/30 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/60">Color</label>
          <button
            onClick={() => onUpdate({ color: getColorRgb(foregroundColor) })}
            className="text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            Use foreground
          </button>
        </div>
        <ColorInput
          value={getColorRgb(entry.color)}
          displayValue={entry.color}
          onColorChange={(color) => onUpdate({ color })}
          onTextChange={(color) => onUpdate({ color })}
        />
      </div>

      <Slider
        label="Line Height"
        value={entry.lineHeight}
        onChange={(v) => onUpdate({ lineHeight: Math.round(v * 10) / 10 })}
        min={1.0}
        max={2.5}
        step={0.1}
      />

      <Slider
        label="Side Padding"
        value={entry.sidePadding}
        onChange={(v) => onUpdate({ sidePadding: Math.round(v) })}
        min={0}
        max={40}
        unit="%"
      />

      <div>
        <label className="block text-sm text-white/60 mb-2">Layer</label>
        <div className="flex gap-1">
          {Z_ORDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ zOrder: opt.value })}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-colors ${
                entry.zOrder === opt.value
                  ? 'bg-white/20 text-white border border-white/40'
                  : 'bg-black/30 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
