import type { GeneratorParams } from "./types";

interface ParametersPanelProps {
  params: GeneratorParams;
  setParams: React.Dispatch<React.SetStateAction<GeneratorParams>>;
}

function ParamSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-6 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%, rgba(255, 255, 255, 0.2) 100%)`,
        }}
      />
    </div>
  );
}

export function ParametersPanel({ params, setParams }: ParametersPanelProps) {
  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Parameters</h2>

      <ParamSlider
        label={`Density: ${params.threshold.toFixed(2)}`}
        value={params.threshold} min={0} max={1} step={0.01}
        onChange={(v) => setParams({ ...params, threshold: v })}
      />

      <ParamSlider
        label={`Fill Amount: ${params.fillAmount}%`}
        value={params.fillAmount} min={0} max={100} step={1}
        onChange={(v) => setParams({ ...params, fillAmount: Math.round(v) })}
      />

      {/* Fill Type Selector */}
      <div>
        <label className="block text-sm text-white/60 mb-3">Fill Type</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(['linear', 'radial', 'angular', 'diamond', 'square', 'box'] as const).map((type) => {
            const typeLabels = {
              linear: 'Linear',
              radial: 'Radial',
              angular: 'Angular',
              diamond: 'Diamond',
              square: 'Square',
              box: 'Box'
            };
            return (
              <button
                key={type}
                onClick={() => setParams({ ...params, fillType: type })}
                className={`py-2.5 px-4 rounded-lg font-medium transition-all shadow-lg ${
                  params.fillType === type
                    ? 'bg-white/20 border-2 border-white/40 text-white'
                    : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
                }`}
              >
                {typeLabels[type]}
              </button>
            );
          })}
        </div>

        {/* Invert Fill Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={params.invertFill}
            onChange={(e) => setParams({ ...params, invertFill: e.target.checked })}
            className="w-5 h-5 rounded cursor-pointer accent-white"
          />
          <span className="text-sm text-white/60 group-hover:text-white transition-colors">Invert Fill Direction</span>
        </label>
      </div>

      <ParamSlider
        label={`Gamma: ${params.gamma.toFixed(2)}`}
        value={params.gamma} min={0.1} max={3} step={0.1}
        onChange={(v) => setParams({ ...params, gamma: v })}
      />

      <ParamSlider
        label={`Frequency: ${params.frequency.toFixed(2)}`}
        value={params.frequency} min={0.01} max={0.5} step={0.01}
        onChange={(v) => setParams({ ...params, frequency: v })}
      />

      <ParamSlider
        label={`Contrast: ${params.contrast.toFixed(2)}`}
        value={params.contrast} min={0.1} max={3} step={0.1}
        onChange={(v) => setParams({ ...params, contrast: v })}
      />

      <ParamSlider
        label={`Directional Neighbors: ${params.directionalNeighbors}`}
        value={params.directionalNeighbors} min={0} max={999} step={1}
        onChange={(v) => setParams({ ...params, directionalNeighbors: Math.round(v) })}
      />

      <ParamSlider
        label={`Direction Density: ${params.directionDensity}`}
        value={params.directionDensity} min={0} max={999} step={1}
        onChange={(v) => setParams({ ...params, directionDensity: Math.round(v) })}
      />
    </div>
  );
}
