import type { PresetConfig } from './presetConfig';
import blogMarketingPresetsData from './blogMarketingPresets.data.json';

/**
 * Presets derived from marketing-icp-website blog fragment exports (including
 * vector text overlays, optional raster images, and logos). Regenerate with:
 * `node scripts/generate-blog-marketing-presets.mjs`
 */
export const BLOG_MARKETING_PRESETS: PresetConfig[] = blogMarketingPresetsData as PresetConfig[];
