interface RadioOption<T extends string> {
  label: string;
  value: T;
  /** When true, this option is visible but not selectable. */
  locked?: boolean;
}

interface RadioSelectorProps<T extends string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function RadioSelector<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: RadioSelectorProps<T>) {
  return (
    <div className={`flex flex-wrap gap-1 p-1 bg-black/30 rounded-lg border border-white/20 ${disabled ? 'opacity-40' : ''}`}>
      {options.map((option) => {
        const optionDisabled = disabled || option.locked;
        return (
          <button
            key={option.value}
            disabled={optionDisabled}
            onClick={() => !optionDisabled && onChange(option.value)}
            className={`flex-1 whitespace-nowrap py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
              optionDisabled
                ? 'text-white/30 cursor-not-allowed'
                : value === option.value
                ? "bg-white/20 text-white"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
