import { useState } from 'react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { GeneratorParams, StateType, LogoConfig } from './types';
import type { TextConfig } from '@/implementation-files/generateTextGrid';
import type { CropDirection } from '@/implementation-files/generateFragmentSvg';
import { Section } from '../ui/Section';

interface PresetConfig {
    label: string;
    value: string;
    // Canvas
    canvasWidth: number;
    canvasHeight: number;
    cellSize: number;
    allowCropping: boolean;
    cropDirection: CropDirection;
    // Colors
    foregroundColor: string;
    backgroundColor: string;
    invertColors: boolean;
    // Animation
    animationEnabled: boolean;
    animationDuration: number;
    // Logo
    logoConfig: LogoConfig;
    // From state
    fromStateType: StateType;
    params: GeneratorParams;
    fromTextConfig: TextConfig;
    // To state (for animation)
    toStateType: StateType;
    toParams: GeneratorParams | null;
    toTextConfig: TextConfig;
}

const PRESETS: PresetConfig[] = [
    {
        label: 'Twitter',
        value: 'twitter',
        canvasWidth: 1200,
        canvasHeight: 675,
        cellSize: 15,
        allowCropping: true,
        cropDirection: 'height',
        foregroundColor: '#FCFCFC',
        backgroundColor: '#1A1A2E',
        invertColors: false,
        animationEnabled: true,
        animationDuration: 800,
        logoConfig: {
            enabled: true,
            x: 96,
            y: 96,
            size: 12,
            color: '#FCFCFC',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.45,
            gamma: 1.2,
            scale: 1,
            frequency: 0.08,
            contrast: 1.4,
            seed: 0.3142,
            directionalNeighbors: 12,
            directionDensity: 65,
            fillAmount: 55,
            fillType: 'radial',
            invertFill: false,
        },
        fromTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
        toStateType: 'text',
        toParams: null,
        toTextConfig: {
            text: 'DFINITY',
            charHeight: 9,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: false,
            invert: false,
            fontResolution: 'high',
        },
    },
    {
        label: 'Discord',
        value: 'discord',
        canvasWidth: 960,
        canvasHeight: 540,
        cellSize: 12,
        allowCropping: true,
        cropDirection: 'width',
        foregroundColor: '#7B68EE',
        backgroundColor: '#0D0D0D',
        invertColors: false,
        animationEnabled: false,
        animationDuration: 600,
        logoConfig: {
            enabled: false,
            x: 97,
            y: 97,
            size: 15,
            color: '#FCFCFC',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.6,
            gamma: 0.8,
            scale: 1,
            frequency: 0.15,
            contrast: 1.8,
            seed: 0.7891,
            directionalNeighbors: 6,
            directionDensity: 80,
            fillAmount: 40,
            fillType: 'diamond',
            invertFill: true,
        },
        fromTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
        toStateType: 'pattern',
        toParams: null,
        toTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
    },
    {
        label: 'Website (small)',
        value: 'website-small',
        canvasWidth: 400,
        canvasHeight: 400,
        cellSize: 10,
        allowCropping: false,
        cropDirection: 'height',
        foregroundColor: '#E0C3FC',
        backgroundColor: '#1B1033',
        invertColors: false,
        animationEnabled: true,
        animationDuration: 1200,
        logoConfig: {
            enabled: true,
            x: 5,
            y: 95,
            size: 18,
            color: '#E0C3FC',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.35,
            gamma: 1.5,
            scale: 1,
            frequency: 0.22,
            contrast: 1.1,
            seed: 0.5555,
            directionalNeighbors: 20,
            directionDensity: 35,
            fillAmount: 70,
            fillType: 'angular',
            invertFill: false,
        },
        fromTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
        toStateType: 'pattern',
        toParams: {
            threshold: 0.65,
            gamma: 0.7,
            scale: 1,
            frequency: 0.05,
            contrast: 2.0,
            seed: 0.5555,
            directionalNeighbors: 4,
            directionDensity: 90,
            fillAmount: 25,
            fillType: 'square',
            invertFill: true,
        },
        toTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
    },
    {
        label: 'Website (large)',
        value: 'website-large',
        canvasWidth: 1920,
        canvasHeight: 1080,
        cellSize: 20,
        allowCropping: false,
        cropDirection: 'height',
        foregroundColor: '#29ABE2',
        backgroundColor: '#0A0A0A',
        invertColors: false,
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 3,
            y: 97,
            size: 10,
            color: '#29ABE2',
        },
        fromStateType: 'text',
        params: {
            threshold: 0.5,
            gamma: 1.0,
            scale: 0.5,
            frequency: 0.1,
            contrast: 1.0,
            seed: 0.1234,
            directionalNeighbors: 8,
            directionDensity: 50,
            fillAmount: 50,
            fillType: 'linear',
            invertFill: false,
        },
        fromTextConfig: {
            text: 'ICP',
            charHeight: 30,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: false,
            invert: true,
            fontResolution: 'high',
        },
        toStateType: 'pattern',
        toParams: {
            threshold: 0.55,
            gamma: 1.3,
            scale: 0.5,
            frequency: 0.12,
            contrast: 1.6,
            seed: 0.1234,
            directionalNeighbors: 15,
            directionDensity: 45,
            fillAmount: 60,
            fillType: 'box',
            invertFill: false,
        },
        toTextConfig: {
            text: '',
            charHeight: 14,
            alignment: 'center',
            verticalAlignment: 'center',
            wordWrap: true,
            invert: false,
            fontResolution: 'mid',
        },
    },
];

interface PresetsSelectionProps {
    state: FragmentState;
}

export function PresetsSelection({ state }: PresetsSelectionProps) {
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const applyPreset = (preset: PresetConfig) => {
        setActivePreset(preset.value);

        // Canvas settings
        state.setCanvasWidth(preset.canvasWidth);
        state.setCanvasHeight(preset.canvasHeight);
        state.setCellSize(preset.cellSize);
        state.setAllowCropping(preset.allowCropping);
        state.setCropDirection(preset.cropDirection);

        // Colors
        state.setForegroundColor(preset.foregroundColor);
        state.setBackgroundColor(preset.backgroundColor);
        state.setCustomPreset({
            foreground: preset.foregroundColor,
            background: preset.backgroundColor,
        });
        state.setInvertColors(preset.invertColors);

        // Animation
        state.setAnimationEnabled(preset.animationEnabled);
        state.setAnimationDuration(preset.animationDuration);
        state.setShowEndState(false);

        // Logo
        state.setLogoConfig(preset.logoConfig);

        // From state
        state.setFromStateType(preset.fromStateType);
        state.setParams(preset.params);
        state.setFromTextConfig(preset.fromTextConfig);

        // To state
        state.setToStateType(preset.toStateType);
        // diffSvg generation requires toParams to be non-null when animation is
        // enabled (even when toStateType is 'text'). The auto-init effect in
        // useFragmentState only fires when animationEnabled *changes*, so going
        // between two animated presets would leave toParams as null. Ensure we
        // always provide a value.
        if (preset.animationEnabled && preset.toParams === null) {
            state.setToParams({ ...preset.params });
        } else {
            state.setToParams(preset.toParams);
        }
        state.setToTextConfig(preset.toTextConfig);
    };

    return (
        <Section title="Presets" borderless>
            <div className="text-sm text-white/60">
                Select a preset to quickly apply a combination of settings. You can further customize colors and other options after selecting a preset.
            </div>

            <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => applyPreset(preset)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                            activePreset === preset.value
                                ? 'bg-white/15 border-2 border-white/40 text-white'
                                : 'text-white/60 border border-white/20 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </Section>
    );
}
