import { useState, useMemo } from 'react';
import type { FragmentState } from '@/hooks/useFragmentState';
import type { FragmentActions } from '@/hooks/useFragmentActions';
import type { GeneratorParams, StateType, LogoConfig } from './types';
import type { TextConfig } from '@/implementation-files/generateTextGrid';
import type { CropDirection, ElongateAxis, ColorMode } from '@/implementation-files/generateFragmentSvg';
import { Section } from '../ui/Section';
import { RadioSelector } from '../ui/RadioSelector';
import { CanvasSettingsPanel } from './CanvasSettingsPanel';
import { ColorsPanel, type LockableColorField } from './ColorsPanel';
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
    /** When true (with logo: true), only show the logo color picker (no position, size, or custom color). */
    logoColorOnly?: boolean;
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
    /**
     * Lock specific color fields within the colors panel.
     * Only relevant when `colors` is true.
     * Listed fields are hidden; unlisted fields remain editable.
     */
    lockedColors?: LockableColorField[];
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
    colorMode?: ColorMode;
    multiColors?: string[];
    colorProportions?: number[];
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
        label: 'Stark',
        value: 'stark',
        customization: {
            colors: true,
            lockedColors: ['colorMode', 'foreground', 'background'],
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 700,
        canvasHeight: 400,
        cellSize: 15,
        allowCropping: true,
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
            size: 30,
            color: '#00F9E1',
            colorSource: 'color1',
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
        label: 'Bordered',
        value: 'bordered',
        customization: {
            colors: true,
            lockedColors: ['colorMode', 'invertColors'],
            logo: true,
            logoColorOnly: true,
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 700,
        canvasHeight: 400,
        cellSize: 50,
        allowCropping: false,
        cropDirection: 'height',
        foregroundColor: '#FCFCFC',
        backgroundColor: '#000000',
        invertColors: false,
        colorMode: 'tri',
        multiColors: ['#FCFCFC', '#262626', '#000000'],
        colorProportions: [0.17, 0.55, 0.28],
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 50,
            y: 50,
            size: 30,
            color: '#FCFCFC',
            colorSource: 'color1',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.61,
            gamma: 0.4,
            scale: 1,
            frequency: 0.1,
            contrast: 0.1,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 21,
            fillType: 'box',
            invertFill: true,
        },
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: {
            threshold: 0.55,
            gamma: 0.7,
            scale: 1,
            frequency: 0.07,
            contrast: 0.1,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 22,
            fillType: 'box',
            invertFill: true,
        },
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Sideway',
        value: 'sideway',
        customization: {
            colors: true,
            lockedColors: ['invertColors'],
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 700,
        canvasHeight: 400,
        cellSize: 25,
        allowCropping: false,
        cropDirection: 'height',
        elongateAxis: 'width',
        elongateAmount: 5,
        foregroundColor: '#6CFF80',
        backgroundColor: '#000000',
        invertColors: false,
        colorMode: 'duo',
        multiColors: ['#FCFCFC', '#C2A3FF'],
        colorProportions: [0.50, 0.50],
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 21,
            y: 50,
            size: 30,
            color: '#00F9E1',
            colorSource: 'color2',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.87,
            gamma: 1.1,
            scale: 1,
            frequency: 0.2,
            contrast: 2.2,
            seed: 0.3142,
            directionalNeighbors: 0,
            directionDensity: 10,
            fillAmount: 49,
            fillType: 'linearHorizontal',
            invertFill: true,
        },
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: {
            threshold: 0.61,
            gamma: 1.4,
            scale: 1,
            frequency: 0.23,
            contrast: 1.9,
            seed: 0.3142,
            directionalNeighbors: 25,
            directionDensity: 176,
            fillAmount: 37,
            fillType: 'linearHorizontal',
            invertFill: true,
        },
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Circular',
        value: 'circular',
        customization: {
            colors: true,
            lockedColors: ['colorMode', 'foreground', 'background'],
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 700,
        canvasHeight: 400,
        cellSize: 25,
        allowCropping: false,
        cropDirection: 'height',
        foregroundColor: '#C2A3FF',
        backgroundColor: '#000000',
        invertColors: false,
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 50,
            y: 50,
            size: 30,
            color: '#C2A3FF',
            colorSource: 'color1',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.6,
            gamma: 0.8,
            scale: 1,
            frequency: 0.09,
            contrast: 0.6,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 39,
            fillType: 'radial',
            invertFill: true,
        },
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: {
            threshold: 0.6,
            gamma: 0.8,
            scale: 1,
            frequency: 0.06,
            contrast: 0.6,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 31,
            fillType: 'radial',
            invertFill: true,
        },
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
    {
        label: 'Splatter',
        value: 'splatter',
        customization: {
            colors: true,
            lockedColors: ['colorMode', 'invertColors'],
            logo: true,
            logoColorOnly: true,
            parameters: true,
            lockedParams: [
                'threshold', 'gamma', 'contrast', 'fillAmount',
                'fillType', 'invertFill', 'directionalNeighbors', 'directionDensity',
            ],
            stateTypeLocked: true,
        },
        canvasWidth: 700,
        canvasHeight: 400,
        cellSize: 10,
        allowCropping: false,
        cropDirection: 'height',
        elongateAxis: 'width',
        elongateAmount: 6,
        foregroundColor: '#FCFCFC',
        backgroundColor: '#0E0030',
        invertColors: false,
        colorMode: 'tri',
        multiColors: ['#FCFCFC', '#6366F1', '#E2FF00'],
        colorProportions: [0.18, 0.62, 0.20],
        animationEnabled: true,
        animationDuration: 600,
        logoConfig: {
            enabled: true,
            x: 50,
            y: 50,
            size: 30,
            color: '#FCFCFC',
            colorSource: 'color1',
        },
        fromStateType: 'pattern',
        params: {
            threshold: 0.31,
            gamma: 0.4,
            scale: 1,
            frequency: 0.24,
            contrast: 1.5,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 49,
            fillType: 'box',
            invertFill: true,
        },
        fromTextConfig: DEFAULT_TEXT_CONFIG,
        toStateType: 'pattern',
        toParams: {
            threshold: 0.31,
            gamma: 0.4,
            scale: 1,
            frequency: 0.22,
            contrast: 1.5,
            seed: 0.6639,
            directionalNeighbors: 0,
            directionDensity: 0,
            fillAmount: 49,
            fillType: 'box',
            invertFill: true,
        },
        toTextConfig: DEFAULT_TEXT_CONFIG,
    },
];

interface PresetsSelectionProps {
    state: FragmentState;
    actions: FragmentActions;
    /** Ref that will be assigned a function to clear the active preset selection */
    clearPresetRef?: React.RefObject<(() => void) | null>;
}

export function PresetsSelection({ state, actions, clearPresetRef }: PresetsSelectionProps) {
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Expose the clear function to the parent via ref
    if (clearPresetRef) {
        clearPresetRef.current = () => setActivePreset(null);
    }

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
        state.setColorMode(preset.colorMode ?? 'mono');
        if (preset.multiColors) state.setMultiColors([...preset.multiColors]);
        if (preset.colorProportions) state.setColorProportions([...preset.colorProportions]);

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

    // Memoize the locked fields sets so they're stable across renders
    const lockedFieldsSet = useMemo(() => {
        if (!activePresetConfig?.customization.lockedParams) return undefined;
        return new Set(activePresetConfig.customization.lockedParams);
    }, [activePresetConfig]);

    const lockedColorFieldsSet = useMemo(() => {
        if (!activePresetConfig?.customization.lockedColors) return undefined;
        return new Set(activePresetConfig.customization.lockedColors);
    }, [activePresetConfig]);

    const hasCustomization = activePresetConfig && Object.values(activePresetConfig.customization).some(Boolean);

    const renderUnlockedPanels = (preset: PresetConfig) => {
        const { customization: c } = preset;
        const panels: React.ReactNode[] = [];

        if (c.canvas) {
            panels.push(<CanvasSettingsPanel key="canvas" state={state} />);
        }
        if (c.colors) {
            panels.push(<ColorsPanel key="colors" state={state} lockedFields={lockedColorFieldsSet} />);
        }
        if (c.logo) {
            panels.push(<LogoPanel key="logo" state={state} colorOnly={c.logoColorOnly} />);
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
