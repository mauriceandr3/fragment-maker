import { type RefObject, useEffect, type CSSProperties } from "react";
import { Square, LayoutGrid, Type } from "lucide-react";
import { CharPreviewPanel } from "./CharPreviewPanel";
import { isTransparent } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import type { FragmentGeneration } from "@/hooks/useFragmentGeneration";
import { GridSkeleton, GridItem } from "./GridItem";
import { getLogoSvgById } from "@/lib/logoRegistry";
import { resolveLogoEntryColor } from "@/lib/resolveLogoColor";
import type { LogoOverlayConfig, TextOverlayConfig, TextOverlayZOrder } from "./types";

function LogoOverlay({ logoConfig, foregroundColor, colorMode, multiColors }: { logoConfig: LogoOverlayConfig; foregroundColor: string; colorMode: string; multiColors: string[] }) {
  if (!logoConfig.enabled || logoConfig.entries.length === 0) return null;

  return (
    <>
      {logoConfig.entries.map(entry => {
        const effectiveColor = resolveLogoEntryColor(entry, colorMode as 'mono' | 'duo' | 'tri' | 'quad', multiColors, foregroundColor);

        const style: CSSProperties = {
          position: 'absolute',
          width: `${entry.size}%`,
          left: `${entry.x}%`,
          top: `${entry.y}%`,
          transform: `translate(-${entry.x}%, -${entry.y}%)`,
          pointerEvents: 'none',
        };

        return (
          <div
            key={entry.id}
            style={style}
            dangerouslySetInnerHTML={{ __html: getLogoSvgById(entry.logoId, effectiveColor ?? undefined) }}
          />
        );
      })}
    </>
  );
}

function TextOverlayPreview({
  config,
  position,
  canvasHeight,
  scale,
}: {
  config: TextOverlayConfig;
  position: TextOverlayZOrder;
  canvasHeight: number;
  scale: number;
}) {
  if (!config.enabled) return null;

  const entries = config.entries.filter(e => e.zOrder === position && e.content.trim());
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(entry => {
        const fontSize = (entry.fontSize / 100) * canvasHeight * scale;
        const top = (entry.y / 100) * 100;

        const style: CSSProperties = {
          position: 'absolute',
          top: `${top}%`,
          left: `${entry.sidePadding}%`,
          right: `${entry.sidePadding}%`,
          fontFamily: 'Inter, sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: entry.fontWeight,
          lineHeight: entry.lineHeight,
          color: entry.color,
          textAlign: entry.alignment,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          pointerEvents: 'none',
        };

        return <div key={entry.id} style={style}>{entry.content}</div>;
      })}
    </>
  );
}

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
    fromStateType, toStateType,
  } = state;

  // Grid view is disabled when any state type is 'text'
  const hasTextState = fromStateType === 'text' || (animationEnabled && toStateType === 'text');

  // Auto-switch to single view if grid was active and a text state is selected
  useEffect(() => {
    if (hasTextState && viewMode === 'grid') {
      setViewMode('single');
    }
  }, [hasTextState, viewMode, setViewMode]);

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
            onClick={() => !hasTextState && setViewMode('grid')}
            disabled={hasTextState}
            title={hasTextState ? 'Grid view not available for text states' : undefined}
            className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
              hasTextState
                ? 'bg-black/20 border border-transparent text-white/30 cursor-not-allowed'
                : viewMode === 'grid'
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('chars')}
            className={`flex items-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
              viewMode === 'chars'
                ? 'bg-white/20 border-2 border-white/40 text-white'
                : 'bg-black/30 border border-transparent text-white/60 hover:text-white hover:bg-black/40'
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-sm">Chars</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-[rgba(255,255,255,0.08)] flex items-center justify-center overflow-auto">
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
          <div className={`flex items-start gap-6 ${canvasWidth >= canvasHeight ? 'flex-col' : 'flex-row'}`}>
            <div className="flex flex-col items-center gap-2">
              {state.showEndState && (
                <span className="text-xs text-white/40 uppercase tracking-wider">From (hover to animate)</span>
              )}
              <div style={{ width: canvasWidth * params.scale, height: canvasHeight * params.scale, position: 'relative' }}>
                <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
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
                <TextOverlayPreview config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />
                <LogoOverlay logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />
              </div>
            </div>
            {state.showEndState && generation.toStateSvg && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">To</span>
                <div style={{ width: canvasWidth * params.scale, height: canvasHeight * params.scale, position: 'relative' }}>
                  <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
                  <div
                    className="border border-white/10 shadow-2xl"
                    style={{
                      transform: `scale(${params.scale})`,
                      transformOrigin: 'top left',
                      width: canvasWidth,
                      height: canvasHeight,
                    }}
                    dangerouslySetInnerHTML={{ __html: generation.toStateSvg }}
                  />
                  <TextOverlayPreview config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />
                  <LogoOverlay logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
            <canvas
              ref={canvasRef}
              className="border border-white/10 shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />
            <TextOverlayPreview config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />
            <LogoOverlay logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />
          </div>
        )
      )}
      {viewMode === 'chars' && (
        <CharPreviewPanel />
      )}
      {(allowCropping || validCellSizes.length > 0) && viewMode === 'grid' && (
        hasTextState ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-8 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl">
              <p className="text-white/60 text-lg">Grid view not available for text states.</p>
            </div>
          </div>
        ) : (
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
        )
      )}
      </div>
    </div>
  );
}
