import { useRef, useMemo } from "react";
import { ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import { resolveLogoEntryColor } from "@/lib/resolveLogoColor";
import { Button } from './ui/Button';
import { useFragmentState } from "@/hooks/useFragmentState";
import { useFragmentGeneration } from "@/hooks/useFragmentGeneration";
import { useCanvasRenderer } from "@/hooks/useCanvasRenderer";
import { useFragmentActions } from "@/hooks/useFragmentActions";
import { useVideoExport } from "@/hooks/useVideoExport";
import { useBatchExport } from "@/hooks/useBatchExport";
import { useFragmentReveal } from "@/implementation-files/useFragmentReveal";
import { PreviewPanel } from "./fragment/PreviewPanel";
import { CanvasSettingsPanel } from "./fragment/CanvasSettingsPanel";
import { AnimationPanel } from "./fragment/AnimationPanel";
import { ColorsPanel } from "./fragment/ColorsPanel";
import { ParametersPanel } from "./fragment/ParametersPanel";
import { TextConfigPanel } from "./fragment/TextConfigPanel";
import { StateTypeSelector } from "./fragment/StateTypeSelector";
import { ExportSvgPanel, ExportPngPanel, ExportImagePanel, ConfigPanel } from "./fragment/ActionButtons";
import { VideoExportPanel } from "./fragment/VideoExportPanel";
import { LogoPanel } from "./fragment/LogoPanel";
import { TextOverlayPanel } from "./fragment/TextOverlayPanel";
import { ImagePanel } from "./fragment/ImagePanel";
import { RadioSelector } from './ui/RadioSelector';
import { PresetsSelection } from './fragment/PresetsSelection';

const sidebarStyle = {
  fontFamily: 'Inter Tight, sans-serif',
  fontWeight: 300,
  scrollbarGutter: 'stable' as const,
};

export function AssetGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const clearPresetRef = useRef<(() => void) | null>(null);

  const state = useFragmentState();
  const generation = useFragmentGeneration(state);
  const actions = useFragmentActions(state, generation);
  const videoExport = useVideoExport();
  const svgBatchExport = useBatchExport();
  const pngBatchExport = useBatchExport();

  useCanvasRenderer({
    canvasRef,
    grid: generation.grid,
    gridDimensions: state.gridDimensions,
    displayForeground: state.displayForeground,
    displayBackground: state.displayBackground,
    scale: state.params.scale,
    cellSize: state.cellSize,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    allowCropping: state.allowCropping,
    cropDirection: state.cropDirection,
    viewMode: state.viewMode,
    animationEnabled: state.animationEnabled,
    colorMode: state.colorMode,
    multiColors: state.multiColors,
    colorProportions: state.colorProportions,
    seed: state.params.seed,
    frequency: state.params.frequency,
    imageOverlayConfig: state.imageOverlayConfig,
  });

  const { onMouseEnter: animationMouseEnter, onMouseLeave: animationMouseLeave } =
    useFragmentReveal(
      animationContainerRef,
      state.debounced.animationDuration,
      state.animationEnabled
    );

  // Derive effective logo config — resolve color for each entry from its selected source
  const effectiveLogoConfig = useMemo(() => {
    if (!state.logoConfig.enabled || state.logoConfig.entries.length === 0) return state.logoConfig;
    return {
      ...state.logoConfig,
      entries: state.logoConfig.entries.map(entry => {
        const resolved = resolveLogoEntryColor(entry, state.colorMode, state.multiColors, state.displayForeground);
        if (resolved === null) return entry; // fixed-color logo
        return { ...entry, color: resolved };
      }),
    };
  }, [state.logoConfig, state.colorMode, state.multiColors, state.displayForeground]);

  return (
    <div className="max-w-full mx-auto h-screen flex flex-col bg-black">
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Canvas/Grid Area */}
        <PreviewPanel
          state={state}
          generation={generation}
          canvasRef={canvasRef}
          animationContainerRef={animationContainerRef}
          animationMouseEnter={animationMouseEnter}
          animationMouseLeave={animationMouseLeave}
        />

        {/* Sidebars */}
        {state.isCollapsed ? (
          <button
            onClick={() => state.setIsCollapsed(false)}
            className="flex-shrink-0 flex items-center justify-center w-12 bg-black/60 backdrop-blur-xl border-l border-white/20 text-white/60 hover:text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex-shrink-0 flex flex-col border-l border-white/20">
            {/* Shared header across both sidebars */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/10" style={sidebarStyle}>
              <h1 className="text-lg text-white tracking-wide">Fragment Generator</h1>
              <button
                onClick={() => state.setIsCollapsed(true)}
                className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
            {/* Sidebar A: Design Controls */}
            <div
              className={`bg-black/60 backdrop-blur-xl overflow-hidden transition-all duration-300 flex flex-col ${
                'w-[440px]'
              }`}
            >
              <div className="relative z-10 px-6 pt-5 pb-3 border-b border-white/10 bg-black" style={sidebarStyle}>
                <h2 className="text-xs text-white/40 uppercase tracking-widest">Create</h2>
              </div>
              <div
                className="flex-1 overflow-y-auto space-y-6 p-6 pb-12"
                style={sidebarStyle}
              >
                <RadioSelector options={[
                    { label: "Presets", value: "presets"},
                    { label: "Custom", value: "custom" },
                ]} value={state.presetOrCustomMode} onChange={state.setPresetOrCustomMode} />

                <div className='pt-4'>
                    {state.presetOrCustomMode === 'presets' ? (
                      <PresetsSelection state={state} actions={actions} clearPresetRef={clearPresetRef} />
                    ) : (
                      <>
                        <CanvasSettingsPanel state={state} />
                        <ColorsPanel state={state} />
                        <LogoPanel state={state} />
                        <TextOverlayPanel state={state} />
                        <ImagePanel state={state} />
                        <AnimationPanel state={state} actions={actions} />

                        {/* Parameters panels - stacked when animation enabled */}
                        {state.animationEnabled && state.toParams ? (
                          <div className="space-y-6">
                            {state.fromStateType === 'pattern' ? (
                              <ParametersPanel
                                params={state.params}
                                setParams={state.setParams}
                                title="From"
                                onRandomize={actions.randomizeParams}
                                headerExtra={<StateTypeSelector value={state.fromStateType} onChange={state.setFromStateType} />}
                              />
                            ) : (
                              <TextConfigPanel
                                config={state.fromTextConfig}
                                setConfig={state.setFromTextConfig}
                                title="From"
                                cols={state.gridDimensions.baseCols}
                                rows={state.gridDimensions.baseRows}
                                patternEnabled={state.fromTextPatternEnabled}
                                onPatternEnabledChange={state.setFromTextPatternEnabled}
                                patternParams={state.fromTextPatternParams}
                                onPatternParamsChange={state.setFromTextPatternParams}
                                onRandomizePattern={actions.randomizeFromTextPatternParams}
                                headerExtra={<StateTypeSelector value={state.fromStateType} onChange={state.setFromStateType} />}
                              />
                            )}
                            {state.toStateType === 'pattern' ? (
                              <ParametersPanel
                                params={state.toParams}
                                setParams={state.setToParams}
                                title="To"
                                onRandomize={actions.randomizeToParams}
                                headerExtra={<StateTypeSelector value={state.toStateType} onChange={state.setToStateType} />}
                              />
                            ) : (
                              <TextConfigPanel
                                config={state.toTextConfig}
                                setConfig={state.setToTextConfig}
                                title="To"
                                cols={state.gridDimensions.baseCols}
                                rows={state.gridDimensions.baseRows}
                                patternEnabled={state.toTextPatternEnabled}
                                onPatternEnabledChange={state.setToTextPatternEnabled}
                                patternParams={state.toTextPatternParams}
                                onPatternParamsChange={state.setToTextPatternParams}
                                onRandomizePattern={actions.randomizeToTextPatternParams}
                                headerExtra={<StateTypeSelector value={state.toStateType} onChange={state.setToStateType} />}
                              />
                            )}
                          </div>
                        ) : (
                          state.fromStateType === 'pattern' ? (
                            <ParametersPanel
                              params={state.params}
                              setParams={state.setParams}
                              title="Parameters"
                              onRandomize={actions.randomizeParams}
                              headerExtra={<StateTypeSelector value={state.fromStateType} onChange={state.setFromStateType} />}
                            />
                          ) : (
                            <TextConfigPanel
                              config={state.fromTextConfig}
                              setConfig={state.setFromTextConfig}
                              title="Text"
                              cols={state.gridDimensions.baseCols}
                              rows={state.gridDimensions.baseRows}
                              patternEnabled={state.fromTextPatternEnabled}
                              onPatternEnabledChange={state.setFromTextPatternEnabled}
                              patternParams={state.fromTextPatternParams}
                              onPatternParamsChange={state.setFromTextPatternParams}
                              onRandomizePattern={actions.randomizeFromTextPatternParams}
                              headerExtra={<StateTypeSelector value={state.fromStateType} onChange={state.setFromStateType} />}
                            />
                          )
                        )}
                      </>
                    )}
                </div>


                {/* Reset - always accessible at bottom of sidebar A */}
                <Button
                  variant="primary"
                  onClick={() => { clearPresetRef.current?.(); actions.resetToDefaults(); }}
                  fullWidth
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>

            {/* Sidebar B: Export */}
            <div className="w-[310px] bg-black/60 backdrop-blur-xl border-l border-white/20 overflow-hidden flex flex-col">
              <div className="relative z-10 px-6 pt-5 pb-3 border-b border-white/10 bg-black" style={sidebarStyle}>
                <h2 className="text-xs text-white/40 uppercase tracking-widest">Export</h2>
              </div>
              <div
                className="flex-1 overflow-y-auto space-y-6 p-6 pb-12"
                style={sidebarStyle}
              >
                <ExportSvgPanel
                  actions={actions}
                  batchExport={svgBatchExport}
                  allowCropping={state.allowCropping}
                  validCellSizes={state.validCellSizes}
                  animationEnabled={state.animationEnabled}
                  logoConfig={effectiveLogoConfig}
                  textOverlayConfig={state.textOverlayConfig}
                  imageOverlayConfig={state.imageOverlayConfig}
                  params={state.params}
                  foregroundColor={state.displayForeground}
                  backgroundColor={state.displayBackground}
                  cellSize={state.cellSize}
                  canvasWidth={state.canvasWidth}
                  canvasHeight={state.canvasHeight}
                  cropDirection={state.cropDirection}
                  fromStateType={state.fromStateType}
                />

                <ExportPngPanel
                  batchExport={pngBatchExport}
                  allowCropping={state.allowCropping}
                  validCellSizes={state.validCellSizes}
                  animationEnabled={state.animationEnabled}
                  textOverlayConfig={state.textOverlayConfig}
                  params={state.params}
                  foregroundColor={state.displayForeground}
                  backgroundColor={state.displayBackground}
                  cellSize={state.cellSize}
                  canvasWidth={state.canvasWidth}
                  canvasHeight={state.canvasHeight}
                  cropDirection={state.cropDirection}
                  fromStateType={state.fromStateType}
                  logoConfig={effectiveLogoConfig}
                  imageOverlayConfig={state.imageOverlayConfig}
                />

                <VideoExportPanel
                  videoExport={videoExport}
                  diffSvg={generation.diffSvg}
                  canvasWidth={state.canvasWidth}
                  canvasHeight={state.canvasHeight}
                  animationDuration={state.debounced.animationDuration}
                  animationEnabled={state.animationEnabled}
                  logoConfig={effectiveLogoConfig}
                  textOverlayConfig={state.textOverlayConfig}
                  imageOverlayConfig={state.imageOverlayConfig}
                />

                <ExportImagePanel
                  imageOverlayConfig={state.imageOverlayConfig}
                  canvasWidth={state.canvasWidth}
                  canvasHeight={state.canvasHeight}
                />

                <ConfigPanel
                  actions={actions}
                  allowCropping={state.allowCropping}
                  validCellSizes={state.validCellSizes}
                  fileInputRef={fileInputRef}
                />
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
