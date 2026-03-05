import { ArrowLeftRight } from "lucide-react";
import type { FragmentState } from "@/hooks/useFragmentState";
import type { FragmentActions } from "@/hooks/useFragmentActions";
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { TextInput } from '../ui/TextInput';

interface AnimationPanelProps {
  state: FragmentState;
  actions: FragmentActions;
}

const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 5.0;

export function AnimationPanel({ state, actions }: AnimationPanelProps) {
  const {
    animationEnabled,
    setAnimationEnabled,
    durationInputValue,
    setDurationInputValue,
    durationInputError,
    setDurationInputError,
    setAnimationDuration,
    animationDuration,
    showEndState,
    setShowEndState,
    toParams,
  } = state;

  const handleDurationChange = (rawValue: string) => {
    setDurationInputValue(rawValue);

    const parsed = parseFloat(rawValue);
    if (rawValue === '' || isNaN(parsed)) {
      setDurationInputError('Invalid number');
    } else if (parsed < MIN_DURATION_SECONDS) {
      setDurationInputError(`Minimum ${MIN_DURATION_SECONDS}s`);
    } else if (parsed > MAX_DURATION_SECONDS) {
      setDurationInputError(`Maximum ${MAX_DURATION_SECONDS}s`);
    } else {
      setDurationInputError(null);
      const ms = Math.round(parsed * 100) * 10;
      setAnimationDuration(ms);
      setDurationInputValue(String(ms / 1000));
    }
  };

  const handleDurationBlur = () => {
    if (durationInputError) {
      setDurationInputValue(String(animationDuration / 1000));
      setDurationInputError(null);
    }
  };

  return (
    <Section title="Animation">

      <Checkbox
        label="Enable animation"
        checked={animationEnabled}
        onChange={setAnimationEnabled}
      />

      {animationEnabled && (
        <>
          <TextInput
            label="Duration (seconds)"
            type="number"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step="0.1"
            value={durationInputValue}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
            error={durationInputError}
          />

          {/* Swap From/To */}
          <button
            onClick={actions.swapFromTo}
            disabled={!toParams}
            className={`w-full backdrop-blur-md border py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm ${
              !toParams
                ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
                : 'bg-black/30 hover:bg-white/10 border-white/20 text-white/70 hover:text-white hover:shadow-xl'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Swap From and To</span>
          </button>

          <Checkbox
            label="Show end state"
            checked={showEndState}
            onChange={setShowEndState}
          />

          <p className="text-xs text-white/40">
            Hover over the preview to animate between From and To patterns.
          </p>
        </>
      )}
    </Section>
  );
}
