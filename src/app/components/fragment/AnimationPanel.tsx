import type { FragmentState } from "@/hooks/useFragmentState";

interface AnimationPanelProps {
  state: FragmentState;
}

export function AnimationPanel({ state }: AnimationPanelProps) {
  const { animationEnabled, setAnimationEnabled } = state;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Animation Preview</h2>

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={animationEnabled}
          onChange={(e) => setAnimationEnabled(e.target.checked)}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">
          Preview animation on hover
        </span>
      </label>

      {animationEnabled && (
        <p className="text-xs text-white/40">
          Hover over the preview to animate between From and To patterns.
        </p>
      )}
    </div>
  );
}
