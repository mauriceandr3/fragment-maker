interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Optional suffix shown after the value in the label, e.g. "%" or "px" */
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
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      {label && (
        <label className="block text-sm text-white/60 mb-2">
          {label}
          {unit !== undefined && (
            <> <span className="text-white/40">{value}{unit}</span></>
          )}
        </label>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%, rgba(255, 255, 255, 0.2) 100%)`,
        }}
      />
    </div>
  );
}
