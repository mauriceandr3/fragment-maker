interface ColorInputProps {
  value: string;
  displayValue: string;
  onColorChange: (color: string) => void;
  onTextChange: (text: string) => void;
  placeholder?: string;
}

export function ColorInput({
  value,
  displayValue,
  onColorChange,
  onTextChange,
  placeholder = '#FCFCFC',
}: ColorInputProps) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onColorChange(e.target.value)}
        className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 p-1"
      />
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onTextChange(e.target.value)}
        className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
        placeholder={placeholder}
      />
    </div>
  );
}
