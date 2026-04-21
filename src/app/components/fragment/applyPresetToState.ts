import type { FragmentState } from '@/hooks/useFragmentState';
import type { PresetConfig } from './presetConfig';
import { DEFAULT_TEXT_OVERLAY_CONFIG, DEFAULT_IMAGE_OVERLAY_CONFIG } from './types';

/** Applies a preset snapshot to live fragment state (same behavior as the Presets panel). */
export function applyPresetToState(state: FragmentState, preset: PresetConfig): void {
    state.setCanvasWidth(preset.canvasWidth);
    state.setCanvasHeight(preset.canvasHeight);
    state.setCellSize(preset.cellSize);
    state.setAllowCropping(preset.allowCropping);
    state.setCropDirection(preset.cropDirection);
    state.setElongateAxis(preset.elongateAxis ?? 'none');
    state.setElongateAmount(preset.elongateAmount ?? 1);

    state.setForegroundColor(preset.foregroundColor);
    state.setBackgroundColor(preset.backgroundColor);
    state.setCustomPreset({
        foreground: preset.foregroundColor,
        background: preset.backgroundColor,
    });
    state.setInvertColors(preset.invertColors);
    state.setColorMode(preset.colorMode ?? 'mono');
    if (preset.multiColors) state.setMultiColors([...preset.multiColors]);
    if (preset.colorProportions) state.setColorProportions([...preset.colorProportions]);
    state.setTextColor(preset.textColor ?? preset.foregroundColor);

    state.setAnimationEnabled(preset.animationEnabled);
    state.setAnimationDuration(preset.animationDuration);
    state.setShowEndState(preset.animationEnabled);

    state.setLogoConfig(preset.logoConfig);

    state.setTextOverlayConfig(
        preset.textOverlayConfig
            ? { ...preset.textOverlayConfig, entries: preset.textOverlayConfig.entries.map((e) => ({ ...e })) }
            : { ...DEFAULT_TEXT_OVERLAY_CONFIG },
    );
    state.setImageOverlayConfig(
        preset.imageOverlayConfig ? { ...preset.imageOverlayConfig } : { ...DEFAULT_IMAGE_OVERLAY_CONFIG },
    );

    const defaultScale = typeof window !== 'undefined' && window.innerWidth < 1920 ? 0.5 : 1;

    state.setFromStateType(preset.fromStateType);
    state.setParams({ ...preset.params, scale: defaultScale });
    state.setFromTextConfig(preset.fromTextConfig);

    state.setToStateType(preset.toStateType);
    if (preset.animationEnabled && preset.toParams === null) {
        state.setToParams({ ...preset.params, scale: defaultScale });
    } else {
        state.setToParams(preset.toParams ? { ...preset.toParams, scale: defaultScale } : null);
    }
    state.setToTextConfig(preset.toTextConfig);
}
