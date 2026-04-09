import { type RefObject, useEffect, useMemo, useState, useCallback, type CSSProperties } from "react";
import { Square, LayoutGrid, Type } from "lucide-react";
import { CharPreviewPanel } from "./CharPreviewPanel";
import { isTransparent } from "@/lib/colorUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import type { FragmentGeneration } from "@/hooks/useFragmentGeneration";
import { GridSkeleton, GridItem } from "./GridItem";
import { getLogoSvgById } from "@/lib/logoRegistry";
import { resolveLogoEntryColor } from "@/lib/resolveLogoColor";
import type { LogoOverlayConfig, TextOverlayConfig, TextOverlayZOrder, ImageOverlayConfig } from "./types";
import { computeImageLayout, generateImageOverlaySvg, isImageBehindCells } from "@/implementation-files/imageOverlay";
import { generateLogoOverlaySvg } from "@/implementation-files/logoOverlay";
import { generateTextOverlaySvg } from "@/implementation-files/textOverlay";

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

function ImageOverlayPreview({
  config,
  canvasWidth,
  canvasHeight,
  scale,
}: {
  config: ImageOverlayConfig;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
}) {
  if (!config.enabled || !config.data || !config.originalWidth || !config.originalHeight) return null;

  const layout = computeImageLayout(config, canvasWidth, canvasHeight);

  const style: CSSProperties = {
    position: 'absolute',
    left: layout.x * scale,
    top: layout.y * scale,
    width: layout.width * scale,
    height: layout.height * scale,
    maxWidth: 'none', // prevent Tailwind preflight max-width: 100% from constraining the image
    pointerEvents: 'none',
  };

  return <img src={config.data} alt="" style={style} />;
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
    projectName, setProjectName,
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

  // Inject image overlay into SVG when image is behind cells.
  // When above cells, the HTML ImageOverlayPreview overlay handles it.
  const imageConfig = state.imageOverlayConfig;
  const imageBehind = isImageBehindCells(imageConfig.overlayLayerOrder);
  const diffSvgWithImage = useMemo(() => {
    if (!diffSvg || !imageConfig.enabled || !imageConfig.data || !imageBehind) return diffSvg;
    const imageSvgMarkup = generateImageOverlaySvg(imageConfig, canvasWidth, canvasHeight);
    if (!imageSvgMarkup) return diffSvg;

    const bgRectEnd = diffSvg.indexOf('/>');
    if (bgRectEnd === -1) return diffSvg;
    const insertPos = bgRectEnd + 2;
    return diffSvg.slice(0, insertPos) + imageSvgMarkup + diffSvg.slice(insertPos);
  }, [diffSvg, imageConfig, imageBehind, canvasWidth, canvasHeight]);

  const toStateSvgWithImage = useMemo(() => {
    const toSvg = generation.toStateSvg;
    if (!toSvg || !imageConfig.enabled || !imageConfig.data || !imageBehind) return toSvg;
    const imageSvgMarkup = generateImageOverlaySvg(imageConfig, canvasWidth, canvasHeight);
    if (!imageSvgMarkup) return toSvg;

    const bgRectEnd = toSvg.indexOf('/>');
    if (bgRectEnd === -1) return toSvg;
    const insertPos = bgRectEnd + 2;
    return toSvg.slice(0, insertPos) + imageSvgMarkup + toSvg.slice(insertPos);
  }, [generation.toStateSvg, imageConfig, imageBehind, canvasWidth, canvasHeight]);

  // --- Grid overlay injection ---
  // Build SVG overlay markup to inject into each grid item SVG
  const gridOverlayMarkup = useMemo(() => {
    const cw = debounced.canvasWidth;
    const ch = debounced.canvasHeight;

    // Resolve logo entry colors
    const resolvedLogoConfig = state.logoConfig.enabled && state.logoConfig.entries.length > 0
      ? {
          enabled: true as const,
          entries: state.logoConfig.entries.map(entry => ({
            logoId: entry.logoId,
            x: entry.x,
            y: entry.y,
            size: entry.size,
            color: resolveLogoEntryColor(entry, state.colorMode, state.multiColors, state.displayForeground) ?? entry.color,
          })),
        }
      : { enabled: false as const, entries: [] as { logoId: typeof state.logoConfig.entries[0]['logoId']; x: number; y: number; size: number; color: string }[] };

    const logoSvg = generateLogoOverlaySvg(resolvedLogoConfig, cw, ch);
    const textAboveSvg = generateTextOverlaySvg(state.textOverlayConfig, cw, ch, 'above');
    const textBehindSvg = generateTextOverlaySvg(state.textOverlayConfig, cw, ch, 'behind');
    const imgSvg = generateImageOverlaySvg(state.imageOverlayConfig, cw, ch);
    const imgBehind = isImageBehindCells(state.imageOverlayConfig.overlayLayerOrder);

    // Build after-cells markup respecting layer order
    const afterCells = state.imageOverlayConfig.overlayLayerOrder
      .filter(l => l !== 'cells')
      .map(layer => {
        if (layer === 'image' && !imgBehind) return imgSvg;
        if (layer === 'text') return textAboveSvg;
        if (layer === 'logo') return logoSvg;
        return '';
      })
      .join('');

    const beforeCells = textBehindSvg + (imgBehind ? imgSvg : '');
    const hasAny = !!(logoSvg || textAboveSvg || textBehindSvg || imgSvg);

    return { beforeCells, afterCells, hasAny };
  }, [state.logoConfig, state.textOverlayConfig, state.imageOverlayConfig,
      state.colorMode, state.multiColors, state.displayForeground,
      debounced.canvasWidth, debounced.canvasHeight]);

  // Grid SVGs with overlays injected
  const gridSvgsWithOverlays = useMemo(() => {
    const { beforeCells, afterCells, hasAny } = gridOverlayMarkup;
    if (!hasAny) return deferredGridSvgs;

    return deferredGridSvgs.map(svg => {
      let result = svg;

      if (beforeCells) {
        // Insert after background rect (first self-closing tag)
        const bgRectEnd = result.indexOf('/>');
        if (bgRectEnd !== -1) {
          const insertPos = bgRectEnd + 2;
          result = result.slice(0, insertPos) + beforeCells + result.slice(insertPos);
        }
      }

      if (afterCells) {
        const closingTag = '</svg>';
        const idx = result.lastIndexOf(closingTag);
        if (idx !== -1) {
          result = result.slice(0, idx) + afterCells + result.slice(idx);
        }
      }

      return result;
    });
  }, [deferredGridSvgs, gridOverlayMarkup]);

  // --- Grid item click / frequency popup ---
  const [frequencyPopup, setFrequencyPopup] = useState<{
    frequency: number;
    x: number;
    y: number;
  } | null>(null);

  const handleGridItemClick = useCallback((frequency: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.animationEnabled) {
      state.setParams(prev => ({ ...prev, frequency }));
      return;
    }
    // Animation mode: show popup
    const rect = e.currentTarget.getBoundingClientRect();
    setFrequencyPopup({
      frequency,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, [state.animationEnabled, state.setParams]);

  const handleSetFrequencyFrom = useCallback(() => {
    if (!frequencyPopup) return;
    state.setParams(prev => ({ ...prev, frequency: frequencyPopup.frequency }));
    setFrequencyPopup(null);
  }, [frequencyPopup, state.setParams]);

  const handleSetFrequencyTo = useCallback(() => {
    if (!frequencyPopup) return;
    state.setToParams(prev => prev ? { ...prev, frequency: frequencyPopup.frequency } : prev);
    setFrequencyPopup(null);
  }, [frequencyPopup, state.setToParams]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header: View Mode Toggle + Project Name */}
      <div className="p-4 pl-8 flex items-center gap-4">
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
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project title"
          className="bg-transparent border-b border-white/20 text-white/80 text-sm px-1 py-1 outline-none focus:border-white/50 placeholder:text-white/30 max-w-48"
        />
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
              <div style={{ width: canvasWidth * params.scale, height: canvasHeight * params.scale, position: 'relative', overflow: 'hidden' }} className="border border-white/10 shadow-2xl">
                <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
                <div
                  ref={animationContainerRef}
                  onMouseEnter={animationMouseEnter}
                  onMouseLeave={animationMouseLeave}
                  style={{
                    transform: `scale(${params.scale})`,
                    transformOrigin: 'top left',
                    width: canvasWidth,
                    height: canvasHeight,
                  }}
                  dangerouslySetInnerHTML={{ __html: diffSvgWithImage }}
                />
                {state.imageOverlayConfig.overlayLayerOrder.filter(l => l !== 'cells').map(layer => {
                  if (layer === 'image' && state.imageOverlayConfig.enabled && !imageBehind) {
                    return <ImageOverlayPreview key="image" config={state.imageOverlayConfig} canvasWidth={canvasWidth} canvasHeight={canvasHeight} scale={params.scale} />;
                  }
                  if (layer === 'text') {
                    return <TextOverlayPreview key="text" config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />;
                  }
                  if (layer === 'logo') {
                    return <LogoOverlay key="logo" logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />;
                  }
                  return null;
                })}
              </div>
            </div>
            {state.showEndState && generation.toStateSvg && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">To</span>
                <div style={{ width: canvasWidth * params.scale, height: canvasHeight * params.scale, position: 'relative', overflow: 'hidden' }} className="border border-white/10 shadow-2xl">
                  <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
                  <div
                    style={{
                      transform: `scale(${params.scale})`,
                      transformOrigin: 'top left',
                      width: canvasWidth,
                      height: canvasHeight,
                    }}
                    dangerouslySetInnerHTML={{ __html: toStateSvgWithImage }}
                  />
                  {state.imageOverlayConfig.overlayLayerOrder.filter(l => l !== 'cells').map(layer => {
                    if (layer === 'image' && state.imageOverlayConfig.enabled && !imageBehind) {
                      return <ImageOverlayPreview key="image" config={state.imageOverlayConfig} canvasWidth={canvasWidth} canvasHeight={canvasHeight} scale={params.scale} />;
                    }
                    if (layer === 'text') {
                      return <TextOverlayPreview key="text" config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />;
                    }
                    if (layer === 'logo') {
                      return <LogoOverlay key="logo" logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />;
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }} className="border border-white/10 shadow-2xl">
            <TextOverlayPreview config={state.textOverlayConfig} position="behind" canvasHeight={canvasHeight} scale={params.scale} />
            <canvas
              ref={canvasRef}
              style={{ imageRendering: 'pixelated' }}
            />
            {state.imageOverlayConfig.overlayLayerOrder.filter(l => l !== 'cells').map(layer => {
              if (layer === 'image' && state.imageOverlayConfig.enabled && !imageBehind) {
                return <ImageOverlayPreview key="image" config={state.imageOverlayConfig} canvasWidth={canvasWidth} canvasHeight={canvasHeight} scale={params.scale} />;
              }
              if (layer === 'text') {
                return <TextOverlayPreview key="text" config={state.textOverlayConfig} position="above" canvasHeight={canvasHeight} scale={params.scale} />;
              }
              if (layer === 'logo') {
                return <LogoOverlay key="logo" logoConfig={state.logoConfig} foregroundColor={state.displayForeground} colorMode={state.colorMode} multiColors={state.multiColors} />;
              }
              return null;
            })}
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
                gridSvgsWithOverlays.map((svg, index) => {
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
                      onClick={(e) => handleGridItemClick(config.frequency, e)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )
      )}
      </div>

      {/* Frequency popup for grid item clicks in animation mode */}
      {frequencyPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFrequencyPopup(null)} />
          <div
            className="fixed z-50 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-xl -translate-x-1/2 -translate-y-full"
            style={{ left: frequencyPopup.x, top: frequencyPopup.y - 8 }}
          >
            <p className="text-white/60 text-xs mb-2 whitespace-nowrap">
              Set frequency <span className="text-white font-medium">{frequencyPopup.frequency.toFixed(2)}</span> as:
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSetFrequencyFrom}
                className="flex-1 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md border border-white/20 transition-colors"
              >
                From
              </button>
              <button
                onClick={handleSetFrequencyTo}
                className="flex-1 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md border border-white/20 transition-colors"
              >
                To
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
