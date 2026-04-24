import type { PresetConfig } from '@/app/components/fragment/presetConfig';
import { assertSerializedListSize, sanitizeCommunityPresetsList, sanitizePresetForCommunity } from '@/lib/communityPresetsStore';

export type CommunityPresetsLoadResult = {
    presets: PresetConfig[];
    /** False when the server has no Upstash env (saves will fail). */
    configured: boolean;
};

/**
 * Vite `base: './'` makes `document.baseURI`–relative "api/..." resolution unreliable
 * (path segment replacement rules). Always anchor from the site origin and optional base path.
 */
function requestUrl(): string {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
        return '/api/community-presets';
    }
    const base = (import.meta.env.BASE_URL as string) || '/';
    const pathFromBase =
        base === './' || base === '/'
            ? '/api/community-presets'
            : `${base.replace(/\/$/, '')}/api/community-presets`;
    return new URL(pathFromBase, location.origin).href;
}

export async function fetchCommunityPresets(): Promise<CommunityPresetsLoadResult> {
    const res = await fetch(requestUrl(), { cache: 'no-store' });
    if (!res.ok) {
        throw new Error(`fetch_community_presets_${res.status}`);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
        throw new Error('fetch_community_presets_not_json');
    }
    const data = (await res.json()) as { presets?: unknown; configured?: boolean };
    const configured = data.configured === true;
    const presets = sanitizeCommunityPresetsList(data.presets ?? []);
    return { presets, configured };
}

export function preparePresetsForSave(presets: PresetConfig[]): PresetConfig[] {
    const next = sanitizeCommunityPresetsList(presets);
    assertSerializedListSize(next);
    return next.map(sanitizePresetForCommunity);
}

export async function postCommunityPresets(presets: PresetConfig[]): Promise<void> {
    const body = { presets: preparePresetsForSave(presets) };
    const res = await fetch(requestUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const textBody = await res.text();
        let detail = `http_${res.status}`;
        try {
            const j = JSON.parse(textBody) as { error?: string };
            if (j.error) detail = j.error;
        } catch {
            if (textBody?.length) {
                detail = textBody.length > 120 ? `${textBody.slice(0, 120)}…` : textBody;
            }
        }
        throw new Error(detail);
    }
}

export function mergeUniqueByPresetValue(
    a: PresetConfig[],
    b: PresetConfig[],
): PresetConfig[] {
    const seen = new Set<string>();
    const out: PresetConfig[] = [];
    for (const p of [...a, ...b]) {
        if (seen.has(p.value)) continue;
        seen.add(p.value);
        out.push(p);
    }
    return out;
}
