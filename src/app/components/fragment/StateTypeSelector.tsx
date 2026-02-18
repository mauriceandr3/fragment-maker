import type { StateType } from "./types";

interface StateTypeSelectorProps {
  value: StateType;
  onChange: (value: StateType) => void;
}

export function StateTypeSelector({ value, onChange }: StateTypeSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-white/20">
      <button
        onClick={() => onChange('pattern')}
        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
          value === 'pattern'
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
      >
        Pattern
      </button>
      <button
        onClick={() => onChange('text')}
        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
          value === 'text'
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
      >
        Text
      </button>
    </div>
  );
}
