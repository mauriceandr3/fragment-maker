import { Shuffle } from "lucide-react";
import type { FragmentState } from "@/hooks/useFragmentState";

interface AnimationPanelProps {
  state: FragmentState;
}

export function AnimationPanel({ state }: AnimationPanelProps) {
  const {
    animationEnabled, setAnimationEnabled,
    animationSeedA, setAnimationSeedA,
    animationSeedB, setAnimationSeedB,
  } = state;

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
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-white/60 mb-2">Seed A</label>
            <input
              type="text"
              value={animationSeedA}
              onChange={(e) => setAnimationSeedA(e.target.value)}
              placeholder="e.g. user-123"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Seed B</label>
            <input
              type="text"
              value={animationSeedB}
              onChange={(e) => setAnimationSeedB(e.target.value)}
              placeholder="e.g. user-456"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
            />
          </div>
          <button
            onClick={() => {
              setAnimationSeedA(`seed-${Math.random().toString(36).slice(2, 8)}`);
              setAnimationSeedB(`seed-${Math.random().toString(36).slice(2, 8)}`);
            }}
            className="w-full bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <Shuffle className="w-4 h-4" />
            <span className="text-sm">Randomize Seeds</span>
          </button>
          <p className="text-xs text-white/40">
            Hover over the preview to animate between patterns A and B.
          </p>
        </div>
      )}
    </div>
  );
}
