import { Shuffle } from "lucide-react";
import type { GeneratorParams } from "./types";
import { Slider } from "../ui/Slider";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Checkbox } from "../ui/Checkbox";

type ParamsSetter = (params: GeneratorParams) => void;

interface ParametersPanelProps {
  params: GeneratorParams;
  setParams: ParamsSetter;
  title?: string;
  onRandomize?: () => void;
}

export function ParametersPanel({ params, setParams, title = "Parameters", onRandomize }: ParametersPanelProps) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {onRandomize && (
          <button
            onClick={onRandomize}
            className="group relative bg-black/40 hover:bg-white backdrop-blur-md border border-white/30 text-white hover:text-black p-2 rounded-lg flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
            title="Randomize"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        )}
      </div>

      <Slider
        label={`Density: ${params.threshold.toFixed(2)}`}
        value={params.threshold} min={0} max={1} step={0.01}
        onChange={(v) => setParams({ ...params, threshold: v })}
      />

      <Slider
        label={`Fill Amount: ${params.fillAmount}%`}
        value={params.fillAmount} min={0} max={100}
        onChange={(v) => setParams({ ...params, fillAmount: Math.round(v) })}
      />

      {/* Fill Type Selector */}
      <div>
        <ButtonGroup
          label="Fill Type"
          value={params.fillType}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
            { value: 'angular', label: 'Angular' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'square', label: 'Square' },
            { value: 'box', label: 'Box' },
          ]}
          columns={2}
          onChange={(type) => setParams({ ...params, fillType: type })}
        />

        <div className="mt-3">
          <Checkbox
            label="Invert Fill Direction"
            checked={params.invertFill}
            onChange={(checked) => setParams({ ...params, invertFill: checked })}
          />
        </div>
      </div>

      <Slider
        label={`Gamma: ${params.gamma.toFixed(2)}`}
        value={params.gamma} min={0.1} max={3} step={0.1}
        onChange={(v) => setParams({ ...params, gamma: v })}
      />

      <Slider
        label={`Frequency: ${params.frequency.toFixed(2)}`}
        value={params.frequency} min={0.01} max={0.5} step={0.01}
        onChange={(v) => setParams({ ...params, frequency: v })}
      />

      <Slider
        label={`Contrast: ${params.contrast.toFixed(2)}`}
        value={params.contrast} min={0.1} max={3} step={0.1}
        onChange={(v) => setParams({ ...params, contrast: v })}
      />

      <Slider
        label={`Directional Neighbors: ${params.directionalNeighbors}`}
        value={params.directionalNeighbors} min={0} max={999}
        onChange={(v) => setParams({ ...params, directionalNeighbors: Math.round(v) })}
      />

      <Slider
        label={`Direction Density: ${params.directionDensity}`}
        value={params.directionDensity} min={0} max={999}
        onChange={(v) => setParams({ ...params, directionDensity: Math.round(v) })}
      />
    </div>
  );
}
