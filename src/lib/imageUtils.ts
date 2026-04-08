/**
 * Utility for compressing/resizing uploaded PNG images.
 * Downscales images to a maximum size relative to the canvas dimensions
 * to prevent bloated config JSON exports.
 */

/** Maximum dimension multiplier relative to canvas (2x for retina). */
const MAX_SCALE = 2;

/**
 * Load an image from a File and return its natural dimensions.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    const url = URL.createObjectURL(file);
    img.src = url;
    // Clean up the object URL after load
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    img.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
  });
}

/**
 * Compress a PNG image file relative to the canvas dimensions.
 * Returns a base64 data URL and the original image dimensions.
 *
 * The image is downscaled so its largest dimension is at most
 * `max(canvasWidth, canvasHeight) * MAX_SCALE`. If the image is already
 * smaller, it's kept at its original size.
 */
export async function compressImage(
  file: File,
  canvasWidth: number,
  canvasHeight: number,
): Promise<{ dataUrl: string; originalWidth: number; originalHeight: number }> {
  const img = await loadImage(file);
  const { naturalWidth, naturalHeight } = img;

  const maxDim = Math.max(canvasWidth, canvasHeight) * MAX_SCALE;

  let targetWidth = naturalWidth;
  let targetHeight = naturalHeight;

  if (naturalWidth > maxDim || naturalHeight > maxDim) {
    const scale = maxDim / Math.max(naturalWidth, naturalHeight);
    targetWidth = Math.round(naturalWidth * scale);
    targetHeight = Math.round(naturalHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/png');

  return { dataUrl, originalWidth: naturalWidth, originalHeight: naturalHeight };
}

export type ImageExportFormat = 'png' | 'webp' | 'avif';

const MIME_TYPES: Record<ImageExportFormat, string> = {
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const FILE_EXTENSIONS: Record<ImageExportFormat, string> = {
  png: 'png',
  webp: 'webp',
  avif: 'avif',
};

/** Check whether the browser supports encoding to a given format. */
export function isFormatSupported(format: ImageExportFormat): boolean {
  if (format === 'png') return true; // always supported
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const dataUrl = canvas.toDataURL(MIME_TYPES[format]);
  // If the browser doesn't support the format, toDataURL falls back to image/png
  return dataUrl.startsWith(`data:${MIME_TYPES[format]}`);
}

/**
 * Re-compress a base64 data URL image to fit the given canvas dimensions.
 * Used at export time to ensure the image matches the current canvas size.
 */
export async function recompressDataUrl(
  dataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  format: ImageExportFormat = 'png',
  quality?: number,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = dataUrl;
  });

  const maxDim = Math.max(canvasWidth, canvasHeight) * MAX_SCALE;
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    const scale = maxDim / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const mime = MIME_TYPES[format];
  // PNG ignores quality; WebP/AVIF use it (0-1, default ~0.85)
  const q = format === 'png' ? undefined : (quality ?? 0.85);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
      mime,
      q,
    );
  });
}

export { FILE_EXTENSIONS };
