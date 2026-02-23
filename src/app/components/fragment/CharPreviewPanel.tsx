import { FONTS, type FontSize } from "@/lib/bitmapFonts";

// Characters to display, in reading order (space omitted — it's invisible)
const DISPLAY_CHARS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  ...Array.from('.,!?-\'":;/()&@#+=*%$_'),
];

const SECTIONS: { size: FontSize; label: string; pixelSize: number }[] = [
  { size: '3x5', label: 'Low  3×5', pixelSize: 3 },
  { size: '5x7', label: 'Mid  5×7', pixelSize: 2 },
  { size: '7x9', label: 'High  7×9', pixelSize: 2 },
];

function GlyphSvg({ char, size, pixelSize }: { char: string; size: FontSize; pixelSize: number }) {
  const font = FONTS[size];
  const glyph = font.glyphs[char];
  if (!glyph) return null;

  const w = font.width * pixelSize;
  const h = font.height * pixelSize;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {glyph.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * pixelSize}
              y={r * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill="white"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function CharPreviewPanel() {
  return (
    <div className="w-full h-full overflow-auto">
      <div className="p-8 pl-8 flex flex-col gap-8 max-w-3xl">
        {SECTIONS.map(({ size, label, pixelSize }, i) => (
          <div key={size}>
            {i > 0 && <div className="border-t border-white/10 mb-8" />}
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-white/80 text-sm font-medium tracking-wide">{label}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-3">
              {DISPLAY_CHARS.map((char, i) => (
                <div
                  key={i}
                  title={char}
                  className="flex items-end"
                  style={{ height: FONTS[size].height * pixelSize }}
                >
                  <GlyphSvg char={char} size={size} pixelSize={pixelSize} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
