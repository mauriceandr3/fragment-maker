import { useState, useEffect, useRef } from "react";

/**
 * Observes a container element and returns its size snapped UP to the nearest
 * cell boundary. The SVG will be slightly larger than the container, so use
 * `overflow-hidden` on the container to clip the excess cleanly.
 *
 * Accounts for cell elongation — pass your config's `elongateAxis` and
 * `elongateAmount` so the effective cell width/height are used for snapping.
 *
 * Only triggers a re-render when the snapped size actually changes, avoiding
 * unnecessary SVG regeneration on sub-pixel resize events.
 *
 * @param containerRef - Ref to the container element to observe
 * @param cellSize - The cell size from your FragmentConfig (e.g. `config.cellSize`)
 * @param options - Optional elongation settings from your FragmentConfig
 * @returns `{ width, height }` snapped to cell boundaries, or `null` before first measurement or if cellSize is undefined
 */
export function useFragmentSize(
  containerRef: React.RefObject<HTMLElement | null>,
  cellSize: number | undefined,
  options?: {
    elongateAxis?: "none" | "width" | "height";
    elongateAmount?: number;
  }
): { width: number; height: number } | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const lastSize = useRef<{ width: number; height: number } | null>(null);

  const elongateAxis = options?.elongateAxis ?? "none";
  const elongateAmount = Math.max(1, Math.round(options?.elongateAmount ?? 1));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || cellSize === undefined) return;

    const cellWidth =
      elongateAxis === "width" ? cellSize * elongateAmount : cellSize;
    const cellHeight =
      elongateAxis === "height" ? cellSize * elongateAmount : cellSize;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;

      // Snap UP to cell boundaries so the SVG fully covers the container.
      // The container's overflow-hidden clips the small excess at the edges.
      const w = Math.ceil(width / cellWidth) * cellWidth;
      const h = Math.ceil(height / cellHeight) * cellHeight;
      const prev = lastSize.current;

      if (!prev || w !== prev.width || h !== prev.height) {
        const snapped = { width: w, height: h };
        lastSize.current = snapped;
        setSize(snapped);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, cellSize, elongateAxis, elongateAmount]);

  return size;
}
