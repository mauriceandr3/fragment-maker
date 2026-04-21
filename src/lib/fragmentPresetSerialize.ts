import type { FragmentState } from '@/hooks/useFragmentState';
import type { PresetConfig, PresetCustomization } from '@/app/components/fragment/presetConfig';
import { USER_SAVED_PRESET_CUSTOMIZATION } from '@/app/components/fragment/presetConfig';

export const USER_PRESETS_STORAGE_KEY = 'fm:user-presets';

export function isUserPresetValue(value: string | null | undefined): boolean {
    return !!value && value.startsWith('user-');
}

export function loadUserPresetsFromStorage(): PresetConfig[] {
    try {
        const raw = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as PresetConfig[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function persistUserPresets(presets: PresetConfig[]): void {
    try {
        localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
        /* quota or private mode */
    }
}

function slugifyName(name: string): string {
    const s = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s.slice(0, 48) || 'preset';
}

function randomSuffix(): string {
    return Math.random().toString(36).slice(2, 8);
}

export function uniqueUserPresetValue(displayName: string, existing: PresetConfig[]): string {
    const base = `user-${slugifyName(displayName)}`;
    let v = `${base}-${randomSuffix()}`;
    while (existing.some((p) => p.value === v)) {
        v = `${base}-${randomSuffix()}`;
    }
    return v;
}

/** Builds a PresetConfig snapshot from the current editor state. */
export function serializeFragmentToPreset(
    state: FragmentState,
    opts: { label: string; value: string; customization?: PresetCustomization },
): PresetConfig {
    const customization = opts.customization ?? USER_SAVED_PRESET_CUSTOMIZATION;
    const params = { ...state.params, scale: 1 };
    const toParams =
        state.animationEnabled && state.toParams ? { ...state.toParams, scale: 1 } : null;

    const preset: PresetConfig = {
        label: opts.label.trim() || 'Untitled',
        value: opts.value,
        customization,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        cellSize: state.cellSize,
        allowCropping: state.allowCropping,
        cropDirection: state.cropDirection,
        elongateAxis: state.elongateAxis,
        elongateAmount: state.elongateAmount,
        foregroundColor: state.foregroundColor,
        backgroundColor: state.backgroundColor,
        invertColors: state.invertColors,
        colorMode: state.colorMode,
        textColor: state.textColor,
        animationEnabled: state.animationEnabled,
        animationDuration: state.animationDuration,
        logoConfig: structuredClone(state.logoConfig),
        fromStateType: state.fromStateType,
        params,
        fromTextConfig: { ...state.fromTextConfig },
        toStateType: state.toStateType,
        toParams,
        toTextConfig: { ...state.toTextConfig },
    };

    if (state.colorMode !== 'mono') {
        preset.multiColors = [...state.multiColors];
        preset.colorProportions = [...state.colorProportions];
    }

    if (state.textOverlayConfig.enabled && state.textOverlayConfig.entries.length > 0) {
        preset.textOverlayConfig = structuredClone(state.textOverlayConfig);
    }
    if (
        state.imageOverlayConfig.enabled &&
        state.imageOverlayConfig.data &&
        state.imageOverlayConfig.originalWidth > 0 &&
        state.imageOverlayConfig.originalHeight > 0
    ) {
        preset.imageOverlayConfig = structuredClone(state.imageOverlayConfig);
    }

    return preset;
}
