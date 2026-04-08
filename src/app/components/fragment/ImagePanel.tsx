import { useRef } from 'react';
import { Upload, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { ImageOverlayConfig, ImageFit, OverlayLayer } from './types';
import { DEFAULT_IMAGE_OVERLAY_CONFIG } from './types';
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import { compressImage } from '@/lib/imageUtils';

interface ImagePanelProps {
  state: FragmentState;
}

export function ImagePanel({ state }: ImagePanelProps) {
  const { imageOverlayConfig, setImageOverlayConfig, canvasWidth, canvasHeight } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (patch: Partial<ImageOverlayConfig>) => {
    setImageOverlayConfig({ ...imageOverlayConfig, ...patch });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/png')) {
      alert('Only PNG files are supported.');
      e.target.value = '';
      return;
    }

    try {
      const { dataUrl, originalWidth, originalHeight } = await compressImage(file, canvasWidth, canvasHeight);
      setImageOverlayConfig({
        ...imageOverlayConfig,
        enabled: true,
        data: dataUrl,
        originalWidth,
        originalHeight,
      });
    } catch {
      alert('Failed to load image.');
    }

    e.target.value = '';
  };

  const deleteImage = () => {
    setImageOverlayConfig({ ...DEFAULT_IMAGE_OVERLAY_CONFIG });
  };

  const hasImage = imageOverlayConfig.data !== '';

  return (
    <Section title="Image" borderless>
      <Checkbox
        label="Show image"
        checked={imageOverlayConfig.enabled}
        onChange={(checked) => updateConfig({ enabled: checked })}
      />

      {imageOverlayConfig.enabled && (
        <div className="space-y-4">
          {/* Upload / preview area */}
          {hasImage ? (
            <div className="space-y-2">
              <div className="relative rounded-lg border border-white/20 overflow-hidden bg-black/30">
                <img
                  src={imageOverlayConfig.data}
                  alt="Uploaded"
                  className="w-full h-40 object-contain"
                />
              </div>
              <button
                onClick={deleteImage}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-red-400 hover:border-red-400/40 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete image
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm">Upload PNG image</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,image/png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {hasImage && (
            <>
              {/* Fit mode */}
              <ButtonGroup<ImageFit>
                label="Fit"
                value={imageOverlayConfig.fit}
                options={[
                  { value: 'contain', label: 'Fit' },
                  { value: 'cover', label: 'Fill' },
                ]}
                onChange={(fit) => updateConfig({ fit })}
              />

              {/* Layer order */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Layer order</label>
                <div className="space-y-1">
                  {[...imageOverlayConfig.overlayLayerOrder].reverse().map((layer, displayIndex) => {
                    const arrayIndex = imageOverlayConfig.overlayLayerOrder.length - 1 - displayIndex;
                    const isTop = arrayIndex === imageOverlayConfig.overlayLayerOrder.length - 1;
                    const isBottom = arrayIndex === 0;
                    const layerLabels: Record<OverlayLayer, string> = { cells: 'Cells', image: 'Image', text: 'Text', logo: 'Logo' };
                    const moveUp = () => {
                      if (isTop) return;
                      const arr = [...imageOverlayConfig.overlayLayerOrder];
                      [arr[arrayIndex], arr[arrayIndex + 1]] = [arr[arrayIndex + 1], arr[arrayIndex]];
                      updateConfig({ overlayLayerOrder: arr });
                    };
                    const moveDown = () => {
                      if (isBottom) return;
                      const arr = [...imageOverlayConfig.overlayLayerOrder];
                      [arr[arrayIndex], arr[arrayIndex - 1]] = [arr[arrayIndex - 1], arr[arrayIndex]];
                      updateConfig({ overlayLayerOrder: arr });
                    };
                    return (
                      <div key={layer} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className={`text-sm ${layer === 'image' ? 'text-white' : 'text-white/50'}`}>{layerLabels[layer]}</span>
                        <div className="flex gap-1">
                          <button onClick={moveUp} disabled={isTop} className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={moveDown} disabled={isBottom} className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Size */}
              <Slider
                label="Size"
                value={imageOverlayConfig.size}
                onChange={(v) => updateConfig({ size: v })}
                min={5}
                max={200}
                unit="%"
              />

              {/* Position */}
              <Slider
                label="X Position"
                value={imageOverlayConfig.x}
                onChange={(v) => updateConfig({ x: v })}
                min={0}
                max={100}
                unit="%"
              />
              <Slider
                label="Y Position"
                value={imageOverlayConfig.y}
                onChange={(v) => updateConfig({ y: v })}
                min={0}
                max={100}
                unit="%"
              />
            </>
          )}
        </div>
      )}
    </Section>
  );
}
