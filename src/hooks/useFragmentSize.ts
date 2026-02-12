import { useState, useEffect, useRef } from 'react';

/**
 * Observes a container element and returns its size snapped to the nearest
 * cell boundary. This ensures the SVG grid aligns cleanly with the container
 * without partial cells or wasted space.
 *
 * Only triggers a re-render when the size changes by at least one full cell,
 * avoiding unnecessary SVG regeneration on sub-pixel resize events.
 *
 * @param containerRef - Ref to the container element to observe
 * @param cellSize - The cell size from your FragmentConfig (e.g. `config.cellSize`)
 * @returns `{ width, height }` snapped to cell boundaries, or `null` before first measurement
 */
export function useFragmentSize(
  containerRef: React.RefObject<HTMLElement | null>,
  cellSize: number
): { width: number; height: number } | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const lastSize = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;

      const w = Math.ceil(width);
      const h = Math.ceil(height);
      const prev = lastSize.current;

      if (!prev || Math.abs(w - prev.width) >= cellSize || Math.abs(h - prev.height) >= cellSize) {
        const snapped = { width: w, height: h };
        lastSize.current = snapped;
        setSize(snapped);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, cellSize]);

  return size;
}
