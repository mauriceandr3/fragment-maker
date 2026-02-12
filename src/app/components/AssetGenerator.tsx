import { useRef } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useFragmentState } from "@/hooks/useFragmentState";
import { useFragmentGeneration } from "@/hooks/useFragmentGeneration";
import { useCanvasRenderer } from "@/hooks/useCanvasRenderer";
import { useFragmentActions } from "@/hooks/useFragmentActions";
import { useFragmentReveal } from "@/hooks/useFragmentReveal";
import { PreviewPanel } from "./fragment/PreviewPanel";
import { CanvasSettingsPanel } from "./fragment/CanvasSettingsPanel";
import { AnimationPanel } from "./fragment/AnimationPanel";
import { ColorsPanel } from "./fragment/ColorsPanel";
import { ParametersPanel } from "./fragment/ParametersPanel";
import { ActionButtons } from "./fragment/ActionButtons";

export function AssetGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationContainerRef = useRef<HTMLDivElement>(null);

  const state = useFragmentState();
  const generation = useFragmentGeneration(state);
  const actions = useFragmentActions(state, generation);

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
  });

  const { onMouseEnter: animationMouseEnter, onMouseLeave: animationMouseLeave } =
    useFragmentReveal(animationContainerRef, state.animationEnabled);

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

        {/* Right: Controls Panel */}
        {state.isCollapsed ? (
          <button
            onClick={() => state.setIsCollapsed(false)}
            className="flex-shrink-0 flex items-center justify-center w-12 bg-black/60 backdrop-blur-xl border-l border-white/20 text-white/60 hover:text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div
            className={`flex-shrink-0 bg-black/60 backdrop-blur-xl border-l border-white/20 overflow-hidden transition-all duration-300 ${
              state.animationEnabled ? 'w-[750px]' : 'w-[400px]'
            }`}
          >
            <div
              className="h-full overflow-y-auto space-y-6 p-6 pb-12"
              style={{
                fontFamily: 'Inter Tight, sans-serif',
                fontWeight: 300,
                scrollbarGutter: 'stable',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2">
                <h1 className="text-lg text-white tracking-wide">Fragment Generator</h1>
                <button
                  onClick={() => state.setIsCollapsed(true)}
                  className="text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Shared sections - always full width */}
              <CanvasSettingsPanel state={state} />
              <AnimationPanel state={state} />
              <ColorsPanel state={state} />

              {/* Parameters panels - side-by-side when animation enabled */}
              {state.animationEnabled && state.toParams ? (
                <div className="grid grid-cols-2 gap-4">
                  <ParametersPanel
                    params={state.params}
                    setParams={state.setParams}
                    title="From"
                    onRandomize={actions.randomizeParams}
                  />
                  <ParametersPanel
                    params={state.toParams}
                    setParams={state.setToParams}
                    title="To"
                    onRandomize={actions.randomizeToParams}
                  />
                </div>
              ) : (
                <ParametersPanel
                  params={state.params}
                  setParams={state.setParams}
                  title="Parameters"
                />
              )}

              <ActionButtons
                actions={actions}
                allowCropping={state.allowCropping}
                validCellSizes={state.validCellSizes}
                fileInputRef={fileInputRef}
                animationEnabled={state.animationEnabled}
              />
            </div>

            {/* Fade Mask at Bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent)'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
