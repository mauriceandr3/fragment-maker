import { useState, useMemo } from 'react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { FragmentActions } from '@/hooks/useFragmentActions';
import type { GeneratorParams, StateType, LogoConfig } from './types';
import type { TextConfig } from '@/implementation-files/generateTextGrid';
import type { CropDirection, ElongateAxis } from '@/implementation-files/generateFragmentSvg';
import { Section } from '../ui/Section';
import { RadioSelector } from '../ui/RadioSelector';
import { CanvasSettingsPanel } from './CanvasSettingsPanel';
import { ColorsPanel } from './ColorsPanel';
import { LogoPanel } from './LogoPanel';
import { AnimationPanel } from './AnimationPanel';
import { ParametersPanel, randomizeUnlockedParams, type LockableParamField } from './ParametersPanel';
import { TextConfigPanel } from './TextConfigPanel';
import { StateTypeSelector } from './StateTypeSelector';

/**
 * Configuration for which parts of the UI the user can customize within a preset.
 * Omitted/false = locked (hidden). true = unlocked (visible).
 * For params, provide an array of field keys to lock; unlisted fields are editable.
 */
interface PresetCustomization {
    /** Show the full canvas settings panel */
    canvas?: boolean;
    /** Show the full colors panel */
    colors?: boolean;
    /** Show the full logo panel */
    logo?: boolean;
    /** Show the full animation panel */
    animation?: boolean;
    /** Show the from/to parameter panels. When true, all fields are unlocked. */
    parameters?: boolean;
    /**
     * Lock specific parameter fields within the from/to panels.
     * Only relevant when `parameters` is true.
     * Listed fields are hidden; unlisted fields remain editable.
     */
    lockedParams?: LockableParamField[];
    /** When true, the Pattern/Text state type toggle is locked (hidden). Default: true (locked). */
    stateTypeLocked?: boolean;
}

interface PresetConfig {
    label: string;
    value: string;
    /** What the user can customize. */
    customization: PresetCustomization;
    // Canvas
    canvasWidth: number;
    canvasHeight: number;
    cellSize: number;
    allowCropping: boolean;
    cropDirection: CropDirection;
    elongateAxis?: ElongateAxis;
    elongateAmount?: number;
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

const DEFAULT_TEXT_CONFIG: TextConfig = {
    text: '',
    charHeight: 14,
    alignment: 'center',
    verticalAlignment: 'center',
    wordWrap: true,
    invert: false,
    fontResolution: 'mid',
};

const PRESETS: PresetConfig[] = [
    {
        label: 'Twitter',
        value: 'twitter',
        customization: {
            colors: true,
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 1200,
        canvasHeight: 675,
        cellSize: 25,
        allowCropping: false,
        cropDirection: 'height',
        elongateAxis: 'width',
        elongateAmount: 3,
        foregroundColor: '#00F9E1',
        backgroundColor: '#000000',
        invertColors: false,
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 50,
            y: 50,
            size: 29,
            color: '#00F9E1',
            useForeground: true,
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.61,
            gamma: 1.1,
            scale: 1,
            frequency: 0.25,
            contrast: 0.4,
            seed: 0.3142,
            directionalNeighbors: 65,
            directionDensity: 187,
            fillAmount: 25,
            fillType: 'linear',
            invertFill: true,
        },
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: {
            threshold: 0.66,
            gamma: 1.1,
            scale: 1,
            frequency: 0.18,
            contrast: 0.6,
            seed: 0.3142,
            directionalNeighbors: 50,
            directionDensity: 209,
            fillAmount: 13,
            fillType: 'linear',
            invertFill: true,
        },
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Discord',
        value: 'discord',
        customization: {
            parameters: true,
            colors: true,
        },
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
            useForeground: false,
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
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: null,
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Website (small)',
        value: 'website-small',
        customization: {
            colors: true,
            logo: true,
        },
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
            useForeground: false,
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
        fromTextConfig: DEFAULT_TEXT_CONFIG,
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
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Website (large)',
        value: 'website-large',
        customization: {
            parameters: true,
            animation: true,
        },
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
            useForeground: false,
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
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
];

interface PresetsSelectionProps {
    state: FragmentState;
    actions: FragmentActions;
}

export function PresetsSelection({ state, actions }: PresetsSelectionProps) {
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const activePresetConfig = PRESETS.find(p => p.value === activePreset) ?? null;

    const applyPreset = (preset: PresetConfig) => {
        setActivePreset(preset.value);

        // Canvas settings
        state.setCanvasWidth(preset.canvasWidth);
        state.setCanvasHeight(preset.canvasHeight);
        state.setCellSize(preset.cellSize);
        state.setAllowCropping(preset.allowCropping);
        state.setCropDirection(preset.cropDirection);
        state.setElongateAxis(preset.elongateAxis ?? 'none');
        state.setElongateAmount(preset.elongateAmount ?? 1);

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
        state.setShowEndState(preset.animationEnabled);

        // Logo
        state.setLogoConfig(preset.logoConfig);

        // Set zoom based on screen width
        const defaultScale = window.innerWidth < 1920 ? 0.5 : 1;

        // From state
        state.setFromStateType(preset.fromStateType);
        state.setParams({ ...preset.params, scale: defaultScale });
        state.setFromTextConfig(preset.fromTextConfig);

        // To state
        state.setToStateType(preset.toStateType);
        if (preset.animationEnabled && preset.toParams === null) {
            state.setToParams({ ...preset.params, scale: defaultScale });
        } else {
            state.setToParams(preset.toParams ? { ...preset.toParams, scale: defaultScale } : null);
        }
        state.setToTextConfig(preset.toTextConfig);
    };

    // Memoize the locked fields set so it's stable across renders
    const lockedFieldsSet = useMemo(() => {
        if (!activePresetConfig?.customization.lockedParams) return undefined;
        return new Set(activePresetConfig.customization.lockedParams);
    }, [activePresetConfig]);

    const hasCustomization = activePresetConfig && Object.values(activePresetConfig.customization).some(Boolean);

    const renderUnlockedPanels = (preset: PresetConfig) => {
        const { customization: c } = preset;
        const panels: React.ReactNode[] = [];

        if (c.canvas) {
            panels.push(<CanvasSettingsPanel key="canvas" state={state} />);
        }
        if (c.colors) {
            panels.push(<ColorsPanel key="colors" state={state} />);
        }
        if (c.logo) {
            panels.push(<LogoPanel key="logo" state={state} />);
        }
        if (c.animation) {
            panels.push(
                <AnimationPanel key="animation" state={state} actions={actions} />
            );
        }
        if (c.parameters) {
            const stateTypeToggleLocked = c.stateTypeLocked !== false; // default: locked
            const stateTypeSelector = (value: StateType, onChange: (v: StateType) => void) =>
                stateTypeToggleLocked ? null : <StateTypeSelector value={value} onChange={onChange} />;

            const makeRandomizeFrom = () =>
                () => state.setParams(randomizeUnlockedParams(state.params, lockedFieldsSet));
            const makeRandomizeTo = () =>
                () => { if (state.toParams) state.setToParams(randomizeUnlockedParams(state.toParams, lockedFieldsSet)); };

            // Render From/To panels like Custom mode
            if (state.animationEnabled && state.toParams) {
                if (state.fromStateType === 'pattern') {
                    panels.push(
                        <ParametersPanel
                            key="params-from"
                            params={state.params}
                            setParams={state.setParams}
                            title="From"
                            onRandomize={makeRandomizeFrom()}
                            headerExtra={stateTypeSelector(state.fromStateType, state.setFromStateType)}
                            lockedFields={lockedFieldsSet}
                        />
                    );
                } else {
                    panels.push(
                        <TextConfigPanel
                            key="text-from"
                            config={state.fromTextConfig}
                            setConfig={state.setFromTextConfig}
                            title="From"
                            cols={state.gridDimensions.baseCols}
                            rows={state.gridDimensions.baseRows}
                            patternEnabled={state.fromTextPatternEnabled}
                            onPatternEnabledChange={state.setFromTextPatternEnabled}
                            patternParams={state.fromTextPatternParams}
                            onPatternParamsChange={state.setFromTextPatternParams}
                            onRandomizePattern={actions.randomizeFromTextPatternParams}
                            headerExtra={stateTypeSelector(state.fromStateType, state.setFromStateType)}
                        />
                    );
                }
                if (state.toStateType === 'pattern') {
                    panels.push(
                        <ParametersPanel
                            key="params-to"
                            params={state.toParams}
                            setParams={state.setToParams}
                            title="To"
                            onRandomize={makeRandomizeTo()}
                            headerExtra={stateTypeSelector(state.toStateType, state.setToStateType)}
                            lockedFields={lockedFieldsSet}
                        />
                    );
                } else {
                    panels.push(
                        <TextConfigPanel
                            key="text-to"
                            config={state.toTextConfig}
                            setConfig={state.setToTextConfig}
                            title="To"
                            cols={state.gridDimensions.baseCols}
                            rows={state.gridDimensions.baseRows}
                            patternEnabled={state.toTextPatternEnabled}
                            onPatternEnabledChange={state.setToTextPatternEnabled}
                            patternParams={state.toTextPatternParams}
                            onPatternParamsChange={state.setToTextPatternParams}
                            onRandomizePattern={actions.randomizeToTextPatternParams}
                            headerExtra={stateTypeSelector(state.toStateType, state.setToStateType)}
                        />
                    );
                }
            } else {
                if (state.fromStateType === 'pattern') {
                    panels.push(
                        <ParametersPanel
                            key="params"
                            params={state.params}
                            setParams={state.setParams}
                            title="Parameters"
                            onRandomize={makeRandomizeFrom()}
                            headerExtra={stateTypeSelector(state.fromStateType, state.setFromStateType)}
                            lockedFields={lockedFieldsSet}
                        />
                    );
                } else {
                    panels.push(
                        <TextConfigPanel
                            key="text"
                            config={state.fromTextConfig}
                            setConfig={state.setFromTextConfig}
                            title="Text"
                            cols={state.gridDimensions.baseCols}
                            rows={state.gridDimensions.baseRows}
                            patternEnabled={state.fromTextPatternEnabled}
                            onPatternEnabledChange={state.setFromTextPatternEnabled}
                            patternParams={state.fromTextPatternParams}
                            onPatternParamsChange={state.setFromTextPatternParams}
                            onRandomizePattern={actions.randomizeFromTextPatternParams}
                            headerExtra={stateTypeSelector(state.fromStateType, state.setFromStateType)}
                        />
                    );
                }
            }
        }

        return panels.length > 0 ? <div className="space-y-6">{panels}</div> : null;
    };

    return (
        <>
            <Section title="Presets" borderless>
                <div className="text-sm text-white/60">
                    Select a preset to quickly apply a combination of settings.
                    {hasCustomization && ' You can customize the options below.'}
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
                {/* Zoom controls inside presets panel */}
                {activePresetConfig && (
                    <div>
                        <h3 className="text-sm text-white/60 mb-3">Zoom</h3>
                        <RadioSelector
                            options={[
                                { label: '25%', value: '0.25' },
                                { label: '50%', value: '0.5' },
                                { label: '100%', value: '1' },
                            ]}
                            value={String(state.params.scale)}
                            onChange={(v) => state.setParams({ ...state.params, scale: Number(v) })}
                        />
                    </div>
                )}
            </Section>

            {activePresetConfig && renderUnlockedPanels(activePresetConfig)}
        </>
    );
}
