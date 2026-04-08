import { useRef, useState, useCallback } from 'react';
import { Upload, Trash2, ChevronUp, ChevronDown, Scissors, Undo2, Loader2 } from 'lucide-react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { ImageOverlayConfig, ImageFit, OverlayLayer } from './types';
import { DEFAULT_IMAGE_OVERLAY_CONFIG } from './types';
import { Section } from '../ui/Section';
import { Checkbox } from '../ui/Checkbox';
import { Slider } from '../ui/Slider';
import { ButtonGroup } from '../ui/ButtonGroup';
import { compressImage, removeImageBackground } from '@/lib/imageUtils';

interface ImagePanelProps {
  state: FragmentState;
}

export function ImagePanel({ state }: ImagePanelProps) {
  const { imageOverlayConfig, setImageOverlayConfig, canvasWidth, canvasHeight } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  // Track whether the current image has had its background removed
  // and store the original so the user can restore it
  const [originalImageData, setOriginalImageData] = useState<string | null>(() => {
    try { return localStorage.getItem('fm:image-data-original'); } catch { return null; }
  });

  const updateConfig = (patch: Partial<ImageOverlayConfig>) => {
    setImageOverlayConfig({ ...imageOverlayConfig, ...patch });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
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
      // Clear any stored original from a previous background removal
      setOriginalImageData(null);
      try { localStorage.removeItem('fm:image-data-original'); } catch { /* ignore */ }
    } catch {
      alert('Failed to load image.');
    }

    e.target.value = '';
  };

  const deleteImage = () => {
    setImageOverlayConfig({ ...DEFAULT_IMAGE_OVERLAY_CONFIG });
    setOriginalImageData(null);
    try { localStorage.removeItem('fm:image-data-original'); } catch { /* ignore */ }
  };

  const handleRemoveBackground = useCallback(async () => {
    if (!imageOverlayConfig.data || isRemovingBg) return;
    setIsRemovingBg(true);
    try {
      // Save original before processing
      setOriginalImageData(imageOverlayConfig.data);
      try { localStorage.setItem('fm:image-data-original', imageOverlayConfig.data); } catch { /* ignore */ }

      const resultDataUrl = await removeImageBackground(imageOverlayConfig.data);
      setImageOverlayConfig({ ...imageOverlayConfig, data: resultDataUrl });
    } catch (err) {
      console.error('Background removal failed:', err);
      alert('Background removal failed. Please try again.');
      // Restore original backup since we didn't succeed
      setOriginalImageData(null);
      try { localStorage.removeItem('fm:image-data-original'); } catch { /* ignore */ }
    } finally {
      setIsRemovingBg(false);
    }
  }, [imageOverlayConfig, isRemovingBg, setImageOverlayConfig]);

  const handleRestoreOriginal = useCallback(() => {
    if (!originalImageData) return;
    setImageOverlayConfig({ ...imageOverlayConfig, data: originalImageData });
    setOriginalImageData(null);
    try { localStorage.removeItem('fm:image-data-original'); } catch { /* ignore */ }
  }, [originalImageData, imageOverlayConfig, setImageOverlayConfig]);

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
                  className={`w-full h-40 object-contain transition-opacity ${isRemovingBg ? 'opacity-30' : ''}`}
                />
                {isRemovingBg && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {originalImageData ? (
                  <button
                    onClick={handleRestoreOriginal}
                    disabled={isRemovingBg}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <Undo2 className="w-4 h-4" />
                    Restore original
                  </button>
                ) : (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isRemovingBg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Removing…
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        Remove background
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={deleteImage}
                  disabled={isRemovingBg}
                  className="flex items-center justify-center p-2 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-red-400 hover:border-red-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm">Upload image</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
