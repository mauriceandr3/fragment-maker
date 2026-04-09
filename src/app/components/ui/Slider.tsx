import { useState, useRef } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Optional suffix shown after the value, e.g. "%" or "px" */
  unit?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: SliderProps) {
  const [editValue, setEditValue] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const pct = ((value - min) / (max - min)) * 100;

  const decimals = step >= 1 ? 0 : Math.ceil(-Math.log10(step));
  const displayValue = value.toFixed(decimals);
  const currentValue = editValue !== null ? editValue : displayValue;

  const commitValue = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      const rounded = parseFloat((Math.round(clamped / step) * step).toFixed(decimals));
      onChange(rounded);
    }
  };

  const handleBlur = () => {
    if (!cancelRef.current && editValue !== null) {
      commitValue(editValue);
    }
    cancelRef.current = false;
    setEditValue(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      cancelRef.current = true;
      e.currentTarget.blur();
    }
  };

  const inputWidth = `${Math.max(currentValue.length, 1) + 0.5}ch`;

  return (
    <div>
      {label && (
        <div className="flex items-baseline text-sm text-white/60 mb-2">
          <span>{label}:&nbsp;</span>
          <input
            type="text"
            inputMode="decimal"
            value={currentValue}
            onChange={(e) => setEditValue(e.target.value)}
            onFocus={(e) => {
              setEditValue(displayValue);
              e.target.select();
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-white/60 border-b border-transparent hover:border-white/30 focus:border-white/50 focus:text-white outline-none tabular-nums"
            style={{ width: inputWidth }}
          />
          {unit && <span className="text-white/40">{unit}</span>}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%, rgba(255, 255, 255, 0.2) 100%)`,
        }}
      />
    </div>
  );
}
