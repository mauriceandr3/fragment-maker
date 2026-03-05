interface ButtonGroupProps<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: number;
}

export function ButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = options.length <= 4 ? options.length : 2,
}: ButtonGroupProps<T>) {
  return (
    <div>
      {label && (
        <label className="block text-sm text-white/60 mb-3">{label}</label>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
              value === option.value
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
