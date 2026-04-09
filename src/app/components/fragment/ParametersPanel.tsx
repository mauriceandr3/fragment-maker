import { Shuffle } from "lucide-react";
import type { GeneratorParams } from "./types";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";
import { ButtonGroup } from "../ui/ButtonGroup";
import { Checkbox } from "../ui/Checkbox";

type ParamsSetter = (params: GeneratorParams) => void;

/** Keys that can be individually locked in the parameters panel */
export type LockableParamField =
  | 'threshold' | 'fillAmount' | 'fillType' | 'invertFill'
  | 'gamma' | 'frequency' | 'contrast'
  | 'directionalNeighbors' | 'directionDensity';

/** All lockable param field keys */
export const ALL_PARAM_FIELDS: LockableParamField[] = [
  'threshold', 'fillAmount', 'fillType', 'invertFill',
  'gamma', 'frequency', 'contrast',
  'directionalNeighbors', 'directionDensity',
];

interface ParametersPanelProps {
  params: GeneratorParams;
  setParams: ParamsSetter;
  title?: string;
  onRandomize?: () => void;
  headerExtra?: React.ReactNode;
  /**
   * Fields to hide and lock. Locked fields are not shown and not affected by randomize.
   * Default: empty (all fields visible and randomizable).
   */
  lockedFields?: ReadonlySet<LockableParamField>;
}

/**
 * Generate random values for the given params, only randomizing fields that are NOT locked.
 * Locked fields retain their current values.
 */
export function randomizeUnlockedParams(
  currentParams: GeneratorParams,
  lockedFields?: ReadonlySet<LockableParamField>,
): GeneratorParams {
  const locked = lockedFields ?? new Set<LockableParamField>();
  return {
    threshold: locked.has('threshold') ? currentParams.threshold : Math.round(Math.random() * 100) / 100,
    gamma: locked.has('gamma') ? currentParams.gamma : Math.round((0.1 + Math.random() * 2.9) * 10) / 10,
    scale: currentParams.scale, // scale is never shown in the panel
    frequency: locked.has('frequency') ? currentParams.frequency : Math.round((0.01 + Math.random() * 0.49) * 100) / 100,
    contrast: locked.has('contrast') ? currentParams.contrast : Math.round((0.1 + Math.random() * 2.9) * 10) / 10,
    seed: Math.round(Math.random() * 10000) / 10000,
    directionalNeighbors: locked.has('directionalNeighbors') ? currentParams.directionalNeighbors : Math.floor(Math.random() * 30),
    directionDensity: locked.has('directionDensity') ? currentParams.directionDensity : Math.floor(Math.random() * 200),
    fillAmount: locked.has('fillAmount') ? currentParams.fillAmount : Math.floor(10 + Math.random() * 80),
    fillType: locked.has('fillType') ? currentParams.fillType : 'linear',
    invertFill: locked.has('invertFill') ? currentParams.invertFill : Math.random() > 0.5,
  };
}

export function ParametersPanel({ params, setParams, title = "Parameters", onRandomize, headerExtra, lockedFields }: ParametersPanelProps) {
  const isVisible = (field: LockableParamField) => !lockedFields?.has(field);

  // Count visible fields to decide if the panel should render at all
  const hasVisibleFields = ALL_PARAM_FIELDS.some(isVisible);
  if (!hasVisibleFields) return null;

  const rightElements = (
    <div className="flex items-center gap-2">
      {headerExtra}
      {onRandomize && (
        <Button
          variant="icon"
          onClick={(e) => { e.stopPropagation(); onRandomize(); }}
          title="Randomize"
          icon={<Shuffle className="w-3.5 h-3.5" />}
        />
      )}
    </div>
  );

  return (
    <Section title={title} rightElement={rightElements}>
      {isVisible('threshold') && (
        <Slider
          label="Density"
          value={params.threshold} min={0} max={1} step={0.01}
          onChange={(v) => setParams({ ...params, threshold: v })}
        />
      )}

      {isVisible('fillAmount') && (
        <Slider
          label="Fill Amount"
          value={params.fillAmount} min={0} max={100}
          onChange={(v) => setParams({ ...params, fillAmount: Math.round(v) })}
          unit="%"
        />
      )}

      {/* Fill Type Selector */}
      {(isVisible('fillType') || isVisible('invertFill')) && (
        <div>
          {isVisible('fillType') && (
            <ButtonGroup
              label="Fill Type"
              value={params.fillType}
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'linearHorizontal', label: 'Linear H' },
                { value: 'radial', label: 'Radial' },
                { value: 'angular', label: 'Angular' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'square', label: 'Square' },
                { value: 'box', label: 'Box' },
              ]}
              columns={2}
              onChange={(type) => setParams({ ...params, fillType: type })}
            />
          )}

          {isVisible('invertFill') && (
            <div className={isVisible('fillType') ? "mt-3" : undefined}>
              <Checkbox
                label="Invert Fill Direction"
                checked={params.invertFill}
                onChange={(checked) => setParams({ ...params, invertFill: checked })}
              />
            </div>
          )}
        </div>
      )}

      {isVisible('gamma') && (
        <Slider
          label="Gamma"
          value={params.gamma} min={0.1} max={3} step={0.1}
          onChange={(v) => setParams({ ...params, gamma: v })}
        />
      )}

      {isVisible('frequency') && (
        <Slider
          label="Frequency"
          value={params.frequency} min={0.01} max={0.5} step={0.01}
          onChange={(v) => setParams({ ...params, frequency: v })}
        />
      )}

      {isVisible('contrast') && (
        <Slider
          label="Contrast"
          value={params.contrast} min={0.1} max={3} step={0.1}
          onChange={(v) => setParams({ ...params, contrast: v })}
        />
      )}

      {isVisible('directionalNeighbors') && (
        <Slider
          label="Directional Neighbors"
          value={params.directionalNeighbors} min={0} max={999}
          onChange={(v) => setParams({ ...params, directionalNeighbors: Math.round(v) })}
        />
      )}

      {isVisible('directionDensity') && (
        <Slider
          label="Direction Density"
          value={params.directionDensity} min={0} max={999}
          onChange={(v) => setParams({ ...params, directionDensity: Math.round(v) })}
        />
      )}
    </Section>
  );
}
