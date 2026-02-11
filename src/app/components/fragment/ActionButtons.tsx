import { type RefObject } from "react";
import { Shuffle, Download, Copy, RotateCcw, FileJson, Upload } from "lucide-react";
import type { FragmentActions } from "@/hooks/useFragmentActions";

interface ActionButtonsProps {
  actions: FragmentActions;
  allowCropping: boolean;
  validCellSizes: number[];
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function ActionButtons({ actions, allowCropping, validCellSizes, fileInputRef }: ActionButtonsProps) {
  const isBlocked = !allowCropping && validCellSizes.length === 0;

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={actions.randomizeParams}
          className="group relative flex-1 bg-black/40 hover:bg-white backdrop-blur-md border border-white/30 text-white hover:text-black py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
        >
          <Shuffle className="w-5 h-5" />
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
            Generate Random
          </span>
        </button>

        <button
          onClick={actions.exportToSVG}
          disabled={isBlocked}
          className={`group relative flex-1 backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg ${
            isBlocked
              ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
              : 'bg-black/30 hover:bg-white border-white/20 text-white hover:text-black hover:shadow-xl'
          }`}
        >
          <Download className="w-5 h-5" />
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
            Export SVG
          </span>
        </button>

        <button
          onClick={actions.copyToClipboard}
          disabled={isBlocked}
          className={`group relative flex-1 backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg ${
            isBlocked
              ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
              : 'bg-black/30 hover:bg-white border-white/20 text-white hover:text-black hover:shadow-xl'
          }`}
        >
          <Copy className="w-5 h-5" />
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-500">
            Copy SVG for Figma
          </span>
        </button>
      </div>

      {/* Reset Button */}
      <button
        onClick={actions.resetToDefaults}
        className="group relative w-full bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-sm">Reset to Default Settings</span>
      </button>

      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={actions.importSettingsFromJson}
        className="hidden"
      />

      {/* Import Settings from JSON */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="group relative w-full bg-black/30 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white/70 hover:text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl mt-3"
      >
        <Upload className="w-4 h-4" />
        <span className="text-sm">Import Settings from JSON</span>
      </button>

      {/* Export Settings as JSON */}
      <button
        onClick={actions.exportSettingsAsJson}
        disabled={isBlocked}
        className={`group relative w-full backdrop-blur-md border py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg mt-3 ${
          isBlocked
            ? 'bg-black/20 border-white/10 text-white/30 cursor-not-allowed'
            : 'bg-black/30 hover:bg-white/10 border-white/20 text-white/70 hover:text-white hover:shadow-xl'
        }`}
      >
        <FileJson className="w-4 h-4" />
        <span className="text-sm">Export Settings as JSON</span>
      </button>
    </>
  );
}
