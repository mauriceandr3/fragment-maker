import { useState, useEffect, useRef, useCallback, memo } from "react";
import { type SeedableParam } from "@/implementation-files/generateFragmentSvg";
import { TOOLTIP_DELAY, TOUCH_LONG_PRESS_DELAY } from "./types";

interface GridSkeletonProps {
  aspectRatio: number;
}

export const GridSkeleton = memo(function GridSkeleton({ aspectRatio }: GridSkeletonProps) {
  return (
    <div
      className="bg-black/40 rounded-lg overflow-hidden border border-white/20 animate-pulse"
      style={{ aspectRatio: aspectRatio }}
    >
      <div className="w-full h-full bg-white/5" />
    </div>
  );
});

interface GridItemProps {
  svg: string;
  index: number;
  isHighlighted: boolean;
  varyingParam: SeedableParam;
  paramValue: number | string;
  aspectRatio: number;
  hasTransparency: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const GridItem = memo(function GridItem({
  svg,
  isHighlighted,
  varyingParam,
  paramValue,
  aspectRatio,
  hasTransparency,
  onClick,
}: GridItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedValue = typeof paramValue === 'number'
    ? (Number.isInteger(paramValue) ? paramValue : paramValue.toFixed(2))
    : paramValue;

  const paramLabel = varyingParam === 'threshold' ? 'Density' :
    varyingParam === 'fillAmount' ? 'Fill %' :
    varyingParam === 'directionalNeighbors' ? 'Dir. Neighbors' :
    varyingParam === 'directionDensity' ? 'Dir. Density' :
    varyingParam.charAt(0).toUpperCase() + varyingParam.slice(1);

  const handleMouseEnter = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, TOOLTIP_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  const handleTouchStart = useCallback(() => {
    touchTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, TOUCH_LONG_PRESS_DELAY);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    setTimeout(() => {
      setShowTooltip(false);
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`relative bg-black/40 rounded-lg overflow-hidden transition-all duration-150 hover:scale-[1.02] ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${
        isHighlighted
          ? 'ring-2 ring-white/60 border-2 border-white/50'
          : 'border border-white/20 hover:border-white/40'
      }`}
      style={{ aspectRatio: aspectRatio }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="absolute inset-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
        style={hasTransparency ? {
          backgroundImage: 'repeating-conic-gradient(#999 0% 25%, #ccc 0% 50%)',
          backgroundSize: '16px 16px',
        } : undefined}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {showTooltip && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 whitespace-nowrap z-10">
          {paramLabel}: {formattedValue}
        </div>
      )}
    </div>
  );
});
