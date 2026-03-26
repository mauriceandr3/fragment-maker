import { useRef, useCallback, useEffect, useState } from 'react';

interface ProportionSliderProps {
  /** Array of colors to display in each segment */
  colors: string[];
  /** Proportions for each segment (0-1 values summing to 1) */
  proportions: number[];
  /** Called when proportions change */
  onChange: (proportions: number[]) => void;
}

const MIN_PROPORTION = 0.05; // 5% minimum per color

/**
 * A multi-thumb slider where each segment represents a color's proportion.
 * Thumbs divide a fixed-width bar; dragging a thumb redistributes between adjacent segments.
 */
export function ProportionSlider({ colors, proportions, onChange }: ProportionSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // Number of dividers = colors.length - 1
  const dividerCount = colors.length - 1;

  // Convert proportions to cumulative positions (0 to 1)
  const getCumulativePositions = useCallback(() => {
    const positions: number[] = [];
    let sum = 0;
    for (let i = 0; i < dividerCount; i++) {
      sum += proportions[i];
      positions.push(sum);
    }
    return positions;
  }, [proportions, dividerCount]);

  const handlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const positions = getCumulativePositions();
    const newPositions = [...positions];

    // Clamp the dragged divider between its neighbors (with minimum proportion)
    const minPos = dragging === 0 ? MIN_PROPORTION : positions[dragging - 1] + MIN_PROPORTION;
    const maxPos = dragging === dividerCount - 1 ? 1 - MIN_PROPORTION : positions[dragging + 1] - MIN_PROPORTION;
    newPositions[dragging] = Math.max(minPos, Math.min(maxPos, x));

    // Convert cumulative positions back to proportions
    const newProportions: number[] = [];
    for (let i = 0; i <= dividerCount; i++) {
      const start = i === 0 ? 0 : newPositions[i - 1];
      const end = i === dividerCount ? 1 : newPositions[i];
      newProportions.push(Math.max(MIN_PROPORTION, end - start));
    }

    // Normalize to ensure sum is exactly 1
    const total = newProportions.reduce((a, b) => a + b, 0);
    const normalized = newProportions.map(p => p / total);

    onChange(normalized);
  }, [dragging, getCumulativePositions, dividerCount, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Also handle pointer up on window in case pointer leaves the element
  useEffect(() => {
    if (dragging === null) return;
    const handleUp = () => setDragging(null);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [dragging]);

  const positions = getCumulativePositions();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-white/60">Proportions</label>
        <span className="text-xs text-white/40">
          {proportions.map(p => `${Math.round(p * 100)}%`).join(' / ')}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-6 rounded-lg overflow-hidden cursor-default select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Color segments */}
        {colors.map((color, i) => {
          const start = i === 0 ? 0 : positions[i - 1];
          const end = i === colors.length - 1 ? 1 : positions[i];
          const width = (end - start) * 100;
          return (
            <div
              key={i}
              className="absolute inset-y-0"
              style={{
                left: `${start * 100}%`,
                width: `${width}%`,
                backgroundColor: color,
              }}
            />
          );
        })}

        {/* Divider thumbs */}
        {positions.map((pos, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center group"
            style={{ left: `${pos * 100}%` }}
            onPointerDown={(e) => handlePointerDown(i, e)}
          >
            <div className={`w-1 h-full rounded-full transition-colors ${
              dragging === i ? 'bg-white' : 'bg-white/60 group-hover:bg-white'
            }`} />
          </div>
        ))}
      </div>
    </div>
  );
}
