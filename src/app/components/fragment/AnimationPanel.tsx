import type { FragmentState } from "@/hooks/useFragmentState";

interface AnimationPanelProps {
  state: FragmentState;
}

const MIN_DURATION_SECONDS = 0.1;
const MAX_DURATION_SECONDS = 5.0;

export function AnimationPanel({ state }: AnimationPanelProps) {
  const {
    animationEnabled,
    setAnimationEnabled,
    durationInputValue,
    setDurationInputValue,
    durationInputError,
    setDurationInputError,
    setAnimationDuration,
    animationDuration,
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
      // Convert seconds to milliseconds, round to nearest 10ms
      const ms = Math.round(parsed * 100) * 10;
      setAnimationDuration(ms);
      // Update display to match rounded value
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
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Animation</h2>

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={animationEnabled}
          onChange={(e) => setAnimationEnabled(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">
          Enable animation
        </span>
      </label>

      {animationEnabled && (
        <>
          <div>
            <label className="block text-sm text-white/60 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              min={MIN_DURATION_SECONDS}
              max={MAX_DURATION_SECONDS}
              step="0.1"
              value={durationInputValue}
              onChange={(e) => handleDurationChange(e.target.value)}
              onBlur={handleDurationBlur}
              className={`w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none transition-colors backdrop-blur-sm ${
                durationInputError
                  ? 'border-2 border-red-500/60 focus:border-red-500/80'
                  : 'border border-white/20 focus:border-white/40'
              }`}
            />
            {durationInputError && (
              <span className="text-xs text-red-400 mt-1 block">{durationInputError}</span>
            )}
          </div>

          <p className="text-xs text-white/40">
            Hover over the preview to animate between From and To patterns.
          </p>
        </>
      )}
    </div>
  );
}
