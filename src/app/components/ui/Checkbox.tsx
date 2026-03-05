interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  size?: 'sm' | 'md';
}

export function Checkbox({
  label,
  checked,
  onChange,
  description,
  size = 'md',
}: CheckboxProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const labelClass = size === 'sm'
    ? 'text-xs text-white/50 group-hover:text-white/80 transition-colors'
    : 'text-sm text-white/60 group-hover:text-white transition-colors';

  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`${sizeClass} rounded cursor-pointer accent-white`}
      />
      {description ? (
        <div className="flex flex-col">
          <span className={labelClass}>{label}</span>
          <span className="text-xs text-white/40">{description}</span>
        </div>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
    </label>
  );
}
