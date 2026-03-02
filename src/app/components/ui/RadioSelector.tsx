interface RadioOption<T extends string> {
  label: string;
  value: T;
}

interface RadioSelectorProps<T extends string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioSelector<T extends string>({
  options,
  value,
  onChange,
}: RadioSelectorProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 p-1 bg-black/30 rounded-lg border border-white/20">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 whitespace-nowrap py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
            value === option.value
              ? "bg-white/20 text-white"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
