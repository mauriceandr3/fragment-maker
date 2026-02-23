interface PercentSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export function PercentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '%',
}: PercentSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">
        {label} <span className="text-white/40">{value}{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-6 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.7) ${pct}%, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0.2) 100%)`,
        }}
      />
    </div>
  );
}
