import { type InputHTMLAttributes } from "react";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string | null;
  onChange: (value: string) => void;
  mono?: boolean;
}

export function TextInput({
  label,
  error,
  onChange,
  mono,
  className: _,
  ...inputProps
}: TextInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm text-white/60 mb-2">{label}</label>
      )}
      <input
        {...inputProps}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm ${
          mono ? 'font-mono' : ''
        } ${
          error
            ? 'border-2 border-red-500/60 focus:border-red-500/80'
            : 'border border-white/20 focus:border-white/40'
        }`}
      />
      {error && (
        <span className="text-xs text-red-400 mt-1 block">{error}</span>
      )}
    </div>
  );
}
