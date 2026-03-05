import { Info } from "lucide-react";
import {
  MIN_CANVAS_DIMENSION,
  MAX_CANVAS_DIMENSION,
  MAX_CELL_SIZE,
  getDynamicMinCellSize,
  findNearestValidCellSize,
} from "@/lib/dimensionUtils";
import type { FragmentState } from "@/hooks/useFragmentState";
import { Section } from '../ui/Section';
import { RadioSelector } from '../ui/RadioSelector';
import { TextInput } from '../ui/TextInput';
import { Slider } from '../ui/Slider';

interface CanvasSettingsPanelProps {
  state: FragmentState;
}

export function CanvasSettingsPanel({ state }: CanvasSettingsPanelProps) {
  const {
    cellSize, setCellSize,
    canvasWidth, setCanvasWidth,
    canvasHeight, setCanvasHeight,
    widthInputValue, setWidthInputValue,
    widthInputError, setWidthInputError,
    heightInputValue, setHeightInputValue,
    heightInputError, setHeightInputError,
    allowCropping, setAllowCropping,
    cropDirection, setCropDirection,
    validCellSizes,
    params, setParams,
  } = state;

  const handleWidthChange = (rawValue: string) => {
    setWidthInputValue(rawValue);
    const parsed = parseFloat(rawValue);
    if (rawValue === '' || isNaN(parsed)) {
      setWidthInputError('Invalid number');
    } else if (parsed < MIN_CANVAS_DIMENSION) {
      setWidthInputError(`Minimum ${MIN_CANVAS_DIMENSION}px`);
    } else if (parsed > MAX_CANVAS_DIMENSION) {
      setWidthInputError(`Maximum ${MAX_CANVAS_DIMENSION}px`);
    } else {
      setWidthInputError(null);
      const intValue = Math.round(parsed);
      setCanvasWidth(intValue);
      setWidthInputValue(String(intValue));
    }
  };

  const handleHeightChange = (rawValue: string) => {
    setHeightInputValue(rawValue);
    const parsed = parseFloat(rawValue);
    if (rawValue === '' || isNaN(parsed)) {
      setHeightInputError('Invalid number');
    } else if (parsed < MIN_CANVAS_DIMENSION) {
      setHeightInputError(`Minimum ${MIN_CANVAS_DIMENSION}px`);
    } else if (parsed > MAX_CANVAS_DIMENSION) {
      setHeightInputError(`Maximum ${MAX_CANVAS_DIMENSION}px`);
    } else {
      setHeightInputError(null);
      const intValue = Math.round(parsed);
      setCanvasHeight(intValue);
      setHeightInputValue(String(intValue));
    }
  };

  return (
    <Section title="Canvas Settings">

      {/* Canvas Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Width (px)"
          type="number"
          min={MIN_CANVAS_DIMENSION}
          max={MAX_CANVAS_DIMENSION}
          value={widthInputValue}
          onChange={handleWidthChange}
          onBlur={() => {
            if (widthInputError) {
              setWidthInputValue(String(canvasWidth));
              setWidthInputError(null);
            }
          }}
          error={widthInputError}
        />
        <TextInput
          label="Height (px)"
          type="number"
          min={MIN_CANVAS_DIMENSION}
          max={MAX_CANVAS_DIMENSION}
          value={heightInputValue}
          onChange={handleHeightChange}
          onBlur={() => {
            if (heightInputError) {
              setHeightInputValue(String(canvasHeight));
              setHeightInputError(null);
            }
          }}
          error={heightInputError}
        />
      </div>

      {/* Cell Size Control */}
      <div>
        <label className="block text-sm text-white/60 mb-2">
          Cell Size: {cellSize}px
          {allowCropping && validCellSizes.includes(cellSize) && (
            <span className="ml-2 text-xs text-green-400">&#10003; Evenly divisible</span>
          )}
        </label>
        {allowCropping && (
          <Slider
            label=""
            value={cellSize}
            min={getDynamicMinCellSize(canvasWidth, canvasHeight)}
            max={MAX_CELL_SIZE}
            onChange={(v) => setCellSize(Math.round(v))}
          />
        )}
        <div className="flex flex-wrap gap-1.5">
          {validCellSizes.map((size) => (
            <button
              key={size}
              onClick={() => setCellSize(size)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                cellSize === size
                  ? 'bg-white/20 border-2 border-white/40 text-white'
                  : 'bg-black/30 border border-white/20 text-white/60 hover:text-white hover:bg-black/40'
              }`}
            >
              {size}px
            </button>
          ))}
        </div>
        {validCellSizes.length > 0 && validCellSizes.length <= 3 && (
          <p className="text-xs text-white/40 mt-2">
            Few valid sizes. Enable Allow cropping for more options.
          </p>
        )}
        {validCellSizes.length === 0 && (
          <p className="text-xs text-red-400 mt-2">
            No valid sizes for these dimensions. Change dimensions or enable Allow cropping.
          </p>
        )}
      </div>

      {/* Allow Cropping Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={allowCropping}
          onChange={(e) => {
            const newAllowCropping = e.target.checked;
            setAllowCropping(newAllowCropping);

            if (!newAllowCropping) {
              if (!validCellSizes.includes(cellSize)) {
                const nearest = findNearestValidCellSize(validCellSizes, cellSize);
                if (nearest !== null) {
                  setCellSize(nearest);
                }
              }
            }
          }}
          className="w-5 h-5 rounded cursor-pointer accent-white"
        />
        <span className="text-sm text-white/60 group-hover:text-white transition-colors">Allow cropping</span>
        <div className="relative">
          <Info className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs rounded-lg whitespace-normal w-64 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity delay-200 z-20">
            Enabling this allows any cell size, even if it doesn&apos;t perfectly divide the SVG dimensions. Fragments at the edge will be cropped.
          </div>
        </div>
      </label>

      {/* Crop Direction Toggle */}
      {allowCropping && (
        <div className="mt-3">
          <label className="block text-sm text-white/60 mb-2">Crop Direction</label>
          <RadioSelector
            options={[
              { label: 'Crop width', value: 'width' },
              { label: 'Crop height', value: 'height' },
            ]}
            value={cropDirection}
            onChange={setCropDirection}
          />
        </div>
      )}

      <div className="border-t border-white/10 my-4"></div>

      {/* Zoom Controls */}
      <h3 className="text-sm text-white/60 mb-3">Zoom</h3>
      <RadioSelector
        options={[
          { label: '25%', value: '0.25' },
          { label: '50%', value: '0.5' },
          { label: '100%', value: '1' },
        ]}
        value={String(params.scale)}
        onChange={(v) => setParams({ ...params, scale: Number(v) })}
      />
    </Section>
  );
}
