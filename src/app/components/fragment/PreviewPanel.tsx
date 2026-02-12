import { type RefObject } from "react";
import { Square, LayoutGrid } from "lucide-react";
import { isTransparent } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import type { FragmentGeneration } from "@/hooks/useFragmentGeneration";
import { GridSkeleton, GridItem } from "./GridItem";

interface PreviewPanelProps {
  state: FragmentState;
  generation: FragmentGeneration;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  animationContainerRef: RefObject<HTMLDivElement | null>;
  animationMouseEnter: () => void;
  animationMouseLeave: () => void;
}

export function PreviewPanel({
  state,
  generation,
  canvasRef,
  animationContainerRef,
  animationMouseEnter,
  animationMouseLeave,
}: PreviewPanelProps) {
  const {
    viewMode, setViewMode,
    allowCropping, validCellSizes,
    animationEnabled,
    params, canvasWidth, canvasHeight,
    debounced,
  } = state;

  const {
    diffSvg, deferredGridSvgs, gridVariations,
    isGridStale, hasGeneratedGrid, highlightedGridIndex,
  } = generation;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* View Mode Toggle */}
      <div className="p-4 pl-8">
        <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-1">
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
              viewMode === 'single'
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            <Square className="w-4 h-4" />
            <span className="text-sm">Single</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
              viewMode === 'grid'
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm">Grid</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-[rgba(255,255,255,0.08)] flex items-center justify-start overflow-auto pl-8">
      {!allowCropping && validCellSizes.length === 0 && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center p-8 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl">
            <p className="text-white/60 text-lg mb-2">No valid cell sizes</p>
            <p className="text-white/40 text-sm">Change dimensions or enable Allow cropping.</p>
          </div>
        </div>
      )}
      {(allowCropping || validCellSizes.length > 0) && viewMode === 'single' && (
        animationEnabled && diffSvg ? (
          <div
            ref={animationContainerRef}
            onMouseEnter={animationMouseEnter}
            onMouseLeave={animationMouseLeave}
            className="border border-white/10 shadow-2xl"
            style={{
              transform: `scale(${params.scale})`,
              transformOrigin: 'top left',
              width: canvasWidth,
              height: canvasHeight,
            }}
            dangerouslySetInnerHTML={{ __html: diffSvg }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="border border-white/10 shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          />
        )
      )}
      {(allowCropping || validCellSizes.length > 0) && viewMode === 'grid' && (
        <div className="w-full h-full overflow-auto p-4">
          <div className="mb-4 flex justify-center">
            <span className="text-white/60 text-sm">Variations in the frequency parameter</span>
          </div>

          <div
            className={`grid gap-3 w-full max-w-[1060px] mx-auto grid-cols-[repeat(4,minmax(120px,1fr))] xl:grid-cols-[repeat(5,minmax(120px,1fr))] transition-opacity duration-150 ${
              isGridStale ? 'opacity-70' : 'opacity-100'
            }`}
          >
            {!hasGeneratedGrid ? (
              Array.from({ length: 20 }, (_, index) => (
                <GridSkeleton key={index} aspectRatio={debounced.canvasWidth / debounced.canvasHeight} />
              ))
            ) : (
              deferredGridSvgs.map((svg, index) => {
                const config = gridVariations[index];

                return (
                  <GridItem
                    key={index}
                    svg={svg}
                    index={index}
                    isHighlighted={index === highlightedGridIndex}
                    varyingParam="frequency"
                    paramValue={config.frequency}
                    aspectRatio={debounced.canvasWidth / debounced.canvasHeight}
                    hasTransparency={isTransparent(debounced.foreground) || isTransparent(debounced.background)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
