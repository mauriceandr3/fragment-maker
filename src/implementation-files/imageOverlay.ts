/**
 * Image overlay SVG generation for Fragment Maker.
 *
 * Generates an SVG `<image>` element from an ImageOverlayConfig,
 * positioned and sized according to the config's fit, size, and position settings.
 */

export type ImageFit = 'contain' | 'cover';
export type OverlayLayer = 'cells' | 'image' | 'text' | 'logo';

export interface ImageOverlayConfig {
  enabled: boolean;
  /** Base64-encoded PNG data URL */
  data: string;
  /** Original image width (before compression) */
  originalWidth: number;
  /** Original image height (before compression) */
  originalHeight: number;
  fit: ImageFit;
  /** Size as percentage of canvas (default 100) */
  size: number;
  /** Horizontal position 0-100% */
  x: number;
  /** Vertical position 0-100% */
  y: number;
  /** Bottom-to-top render order — 'cells' is the fragment grid */
  overlayLayerOrder: OverlayLayer[];
}

/** Helper: determine if image is behind cells based on layer order */
export function isImageBehindCells(layerOrder: OverlayLayer[]): boolean {
  const cellsIdx = layerOrder.indexOf('cells');
  const imageIdx = layerOrder.indexOf('image');
  return imageIdx < cellsIdx;
}

/**
 * Compute the position and dimensions for the image overlay.
 * Returns the x, y, width, height in canvas pixels.
 */
export function computeImageLayout(
  config: ImageOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  const imgAspect = config.originalWidth / config.originalHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  // Base dimensions: fit the image to the canvas at 100% size
  let baseWidth: number;
  let baseHeight: number;

  if (config.fit === 'contain') {
    // Contain: largest axis fits within canvas
    if (imgAspect > canvasAspect) {
      // Image is wider than canvas — fit width
      baseWidth = canvasWidth;
      baseHeight = canvasWidth / imgAspect;
    } else {
      // Image is taller than canvas — fit height
      baseHeight = canvasHeight;
      baseWidth = canvasHeight * imgAspect;
    }
  } else {
    // Cover: smallest axis fills canvas (crops excess)
    if (imgAspect > canvasAspect) {
      // Image is wider — fit height, overflow width
      baseHeight = canvasHeight;
      baseWidth = canvasHeight * imgAspect;
    } else {
      // Image is taller — fit width, overflow height
      baseWidth = canvasWidth;
      baseHeight = canvasWidth / imgAspect;
    }
  }

  // Apply size scaling
  const scale = config.size / 100;
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  // Position: x/y are 0-100% where 50% centers the image on the canvas.
  // x=0% puts the image center at the left edge (half off-canvas left),
  // x=100% puts the image center at the right edge (half off-canvas right).
  // This allows the image to travel fully off-canvas in any direction.
  const centerX = (config.x / 100) * canvasWidth;
  const centerY = (config.y / 100) * canvasHeight;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return { x, y, width, height };
}

/**
 * Generate SVG markup for the image overlay.
 * Returns an empty string if the config is disabled or has no data.
 */
export function generateImageOverlaySvg(
  config: ImageOverlayConfig | undefined,
  canvasWidth: number,
  canvasHeight: number,
): string {
  if (!config?.enabled || !config.data || !config.originalWidth || !config.originalHeight) {
    return '';
  }

  const { x, y, width, height } = computeImageLayout(config, canvasWidth, canvasHeight);

  return `<image href="${config.data}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none"/>`;
}
