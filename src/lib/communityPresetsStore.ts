import type { PresetConfig } from '@/app/components/fragment/presetConfig';

export const COMMUNITY_PRESETS_REDIS_KEY = 'fm:community-presets-v1';
export const MAX_COMMUNITY_PRESETS = 400;
const MAX_IMAGE_DATA_IN_PRESET = 120_000;
const MAX_SERIALIZED_LIST = 4_000_000;

function stripOversizeImageData(p: PresetConfig): PresetConfig {
    if (!p.imageOverlayConfig?.data) return p;
    if (p.imageOverlayConfig.data.length <= MAX_IMAGE_DATA_IN_PRESET) return p;
    return {
        ...p,
        imageOverlayConfig: {
            ...p.imageOverlayConfig,
            enabled: false,
            data: '',
        },
    };
}

/** Shrink or drop image data so shared presets stay within API limits. */
export function sanitizePresetForCommunity(p: PresetConfig): PresetConfig {
    return stripOversizeImageData(p);
}

export function sanitizeCommunityPresetsList(presets: unknown): PresetConfig[] {
    if (!Array.isArray(presets)) return [];
    const out: PresetConfig[] = [];
    for (const item of presets) {
        if (!item || typeof item !== 'object') continue;
        const p = item as PresetConfig;
        if (typeof p.label !== 'string' || typeof p.value !== 'string') continue;
        if (p.label.length > 200) continue;
        if (!p.value.startsWith('user-') || p.value.length > 120) continue;
        out.push(sanitizePresetForCommunity(p));
        if (out.length >= MAX_COMMUNITY_PRESETS) break;
    }
    return out;
}

export function assertSerializedListSize(presets: PresetConfig[]): void {
    const n = JSON.stringify(presets).length;
    if (n > MAX_SERIALIZED_LIST) {
        throw new Error('Community presets list too large');
    }
}
