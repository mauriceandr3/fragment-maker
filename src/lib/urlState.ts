import { type FillType, type ElongateAxis, type ColorMode } from '../implementation-files/generateFragmentSvg';
import type { TextConfig } from '../implementation-files/generateTextGrid';
import { RESOLUTION_MIN_HEIGHT } from '../implementation-files/generateTextGrid';
import type { LogoConfig } from '../app/components/fragment/types';
import { DEFAULT_LOGO_CONFIG } from '../app/components/fragment/types';
import type { TextOverlayConfig } from '../implementation-files/textOverlay';
import { DEFAULT_TEXT_OVERLAY_CONFIG, isValidFontWeight } from '../implementation-files/textOverlay';
import {
  MIN_CANVAS_DIMENSION,
  MAX_CANVAS_DIMENSION,
  MAX_CELL_SIZE,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_CELL_SIZE,
} from './dimensionUtils';

export type StateType = 'pattern' | 'text';

export interface GeneratorParamsUrl {
  threshold: number;
  gamma: number;
  scale: number;
  frequency: number;
  contrast: number;
  seed: number;
  directionalNeighbors: number;
  directionDensity: number;
  fillAmount: number;
  fillType: FillType;
  invertFill: boolean;
}

export interface UrlSerializableState {
  threshold: number;
  gamma: number;
  scale: number;
  frequency: number;
  contrast: number;
  seed: number;
  directionalNeighbors: number;
  directionDensity: number;
  fillAmount: number;
  fillType: FillType;
  invertFill: boolean;
  canvasWidth: number;
  canvasHeight: number;
  cellSize: number;
  allowCropping: boolean;
  cropDirection: 'width' | 'height';
  elongateAxis: ElongateAxis;
  elongateAmount: number;
  presetOrCustomMode?: 'presets' | 'custom';
  foregroundColor: string;
  backgroundColor: string;
  invertColors: boolean;
  colorMode: ColorMode;
  multiColors: string[];
  colorProportions: number[];
  textColor: string;
  animationEnabled: boolean;
  animationDuration: number; // milliseconds
  toParams: GeneratorParamsUrl | null;
  // State types for pattern/text switching (defaults to 'pattern' when absent)
  fromStateType: StateType;
  toStateType: StateType;
  // Text configurations (only relevant when state type is 'text')
  fromTextConfig: TextConfig;
  toTextConfig: TextConfig;
  // Show end state preview alongside the main animation preview
  showEndState: boolean;
  // Logo overlay configuration
  logoConfig: LogoConfig;
  // Text overlay configuration
  textOverlayConfig: TextOverlayConfig;
}

// Short URL keys for each state field
const PARAM_KEYS = {
  threshold: 't',
  gamma: 'g',
  scale: 'sc',
  frequency: 'f',
  contrast: 'c',
  seed: 's',
  directionalNeighbors: 'dn',
  directionDensity: 'dd',
  fillAmount: 'fa',
  fillType: 'ft',
  invertFill: 'if',
  canvasWidth: 'w',
  canvasHeight: 'h',
  cellSize: 'cs',
  allowCropping: 'cr',
  cropDirection: 'cd',
  elongateAxis: 'ea',
  elongateAmount: 'em',
  foregroundColor: 'fg',
  backgroundColor: 'bg',
  invertColors: 'ic',
  colorMode: 'cm',
  multiColors: 'mc',
  colorProportions: 'cp',
  textColor: 'tc',
  animationEnabled: 'ae',
  animationDuration: 'ad',
  // To params (for animation)
  toThreshold: 'to_t',
  toGamma: 'to_g',
  toScale: 'to_sc',
  toFrequency: 'to_f',
  toContrast: 'to_c',
  toSeed: 'to_s',
  toDirectionalNeighbors: 'to_dn',
  toDirectionDensity: 'to_dd',
  toFillAmount: 'to_fa',
  toFillType: 'to_ft',
  toInvertFill: 'to_if',
  // Text state params
  fromStateType: 'fst',
  toStateType: 'tst',
  fromText: 'ftxt',
  toText: 'ttxt',
  fromCharHeight: 'fch',
  toCharHeight: 'tch',
  fromAlignment: 'fal',
  toAlignment: 'tal',
  fromVerticalAlignment: 'fva',
  toVerticalAlignment: 'tva',
  fromWordWrap: 'fww',
  toWordWrap: 'tww',
  fromInvert: 'fin',
  toInvert: 'tin',
  fromFontResolution: 'ffr',
  toFontResolution: 'tfr',
  showEndState: 'se',
  // Logo overlay
  logoEnabled: 'le',
  logoX: 'lx',
  logoY: 'ly',
  logoSize: 'ls',
  logoColor: 'lc',
  presetOrCustomMode: 'pcm',
  // Text overlay
  textOverlayEnabled: 'txoe',
} as const;

// Default text configuration
const DEFAULT_TEXT_CONFIG: TextConfig = {
  text: '',
  charHeight: 14,
  alignment: 'center',
  verticalAlignment: 'center',
  wordWrap: true,
  invert: false,
  fontResolution: 'mid',
};

// Defaults (seed excluded — it's random by nature)
const DEFAULTS: Omit<UrlSerializableState, 'seed'> = {
  threshold: 0.5,
  gamma: 1.0,
  scale: 0.5,
  frequency: 0.1,
  contrast: 1.0,
  directionalNeighbors: 8,
  directionDensity: 50,
  fillAmount: 50,
  fillType: 'linear',
  invertFill: false,
  canvasWidth: DEFAULT_WIDTH,
  canvasHeight: DEFAULT_HEIGHT,
  cellSize: DEFAULT_CELL_SIZE,
  allowCropping: false,
  cropDirection: 'height',
  elongateAxis: 'none',
  elongateAmount: 1,
  foregroundColor: '#FCFCFC',
  backgroundColor: '#000000',
  invertColors: false,
  colorMode: 'mono',
  multiColors: ['#FCFCFC', '#C2A3FF'],
  colorProportions: [0.5, 0.5],
  textColor: '#FCFCFC',
  animationEnabled: false,
  animationDuration: 600, // 600ms = 0.6s
  toParams: null,
  fromStateType: 'pattern',
  toStateType: 'pattern',
  fromTextConfig: DEFAULT_TEXT_CONFIG,
  toTextConfig: DEFAULT_TEXT_CONFIG,
  showEndState: false,
  logoConfig: DEFAULT_LOGO_CONFIG,
  textOverlayConfig: DEFAULT_TEXT_OVERLAY_CONFIG,
};

export function serializeStateToUrl(state: UrlSerializableState): string {
  const params = new URLSearchParams();

  const addIfChanged = (key: string, value: string, defaultValue: string) => {
    if (value !== defaultValue) params.set(key, value);
  };

  // Numbers — only include if different from default
  addIfChanged(PARAM_KEYS.threshold, String(state.threshold), String(DEFAULTS.threshold));
  addIfChanged(PARAM_KEYS.gamma, String(state.gamma), String(DEFAULTS.gamma));

  addIfChanged(PARAM_KEYS.presetOrCustomMode, state.presetOrCustomMode ?? '', DEFAULTS.presetOrCustomMode ?? '');

  addIfChanged(PARAM_KEYS.scale, String(state.scale), String(DEFAULTS.scale));
  addIfChanged(PARAM_KEYS.frequency, String(state.frequency), String(DEFAULTS.frequency));
  addIfChanged(PARAM_KEYS.contrast, String(state.contrast), String(DEFAULTS.contrast));
  addIfChanged(PARAM_KEYS.directionalNeighbors, String(state.directionalNeighbors), String(DEFAULTS.directionalNeighbors));
  addIfChanged(PARAM_KEYS.directionDensity, String(state.directionDensity), String(DEFAULTS.directionDensity));
  addIfChanged(PARAM_KEYS.fillAmount, String(state.fillAmount), String(DEFAULTS.fillAmount));
  addIfChanged(PARAM_KEYS.canvasWidth, String(state.canvasWidth), String(DEFAULTS.canvasWidth));
  addIfChanged(PARAM_KEYS.canvasHeight, String(state.canvasHeight), String(DEFAULTS.canvasHeight));
  addIfChanged(PARAM_KEYS.cellSize, String(state.cellSize), String(DEFAULTS.cellSize));

  // Seed: always include (default is random, so any value is meaningful)
  params.set(PARAM_KEYS.seed, String(state.seed));

  // Enums
  addIfChanged(PARAM_KEYS.fillType, state.fillType, DEFAULTS.fillType);
  addIfChanged(PARAM_KEYS.cropDirection, state.cropDirection, DEFAULTS.cropDirection);

  // Booleans as 0/1
  addIfChanged(PARAM_KEYS.invertFill, state.invertFill ? '1' : '0', DEFAULTS.invertFill ? '1' : '0');
  addIfChanged(PARAM_KEYS.allowCropping, state.allowCropping ? '1' : '0', DEFAULTS.allowCropping ? '1' : '0');
  addIfChanged(PARAM_KEYS.invertColors, state.invertColors ? '1' : '0', DEFAULTS.invertColors ? '1' : '0');

  // Multi-color
  addIfChanged(PARAM_KEYS.colorMode, state.colorMode, DEFAULTS.colorMode);
  if (state.colorMode !== 'mono') {
    params.set(PARAM_KEYS.multiColors, state.multiColors.map(c => c.replace('#', '')).join(','));
    params.set(PARAM_KEYS.colorProportions, state.colorProportions.map(p => String(Math.round(p * 100))).join(','));
  }

  // Text color (only when non-default)
  addIfChanged(PARAM_KEYS.textColor, state.textColor.replace('#', ''), DEFAULTS.textColor.replace('#', ''));

  // Elongation
  addIfChanged(PARAM_KEYS.elongateAxis, state.elongateAxis, DEFAULTS.elongateAxis);
  addIfChanged(PARAM_KEYS.elongateAmount, String(state.elongateAmount), String(DEFAULTS.elongateAmount));

  // Colors: strip '#'
  addIfChanged(PARAM_KEYS.foregroundColor, state.foregroundColor.replace('#', ''), DEFAULTS.foregroundColor.replace('#', ''));
  addIfChanged(PARAM_KEYS.backgroundColor, state.backgroundColor.replace('#', ''), DEFAULTS.backgroundColor.replace('#', ''));

  // Animation
  addIfChanged(PARAM_KEYS.animationEnabled, state.animationEnabled ? '1' : '0', DEFAULTS.animationEnabled ? '1' : '0');
  addIfChanged(PARAM_KEYS.animationDuration, String(state.animationDuration), String(DEFAULTS.animationDuration));

  // Show end state (only when animation is enabled)
  if (state.animationEnabled) {
    addIfChanged(PARAM_KEYS.showEndState, state.showEndState ? '1' : '0', '0');
  }

  // To params (only when animation is enabled and toParams exists)
  if (state.animationEnabled && state.toParams) {
    const tp = state.toParams;
    params.set(PARAM_KEYS.toThreshold, String(tp.threshold));
    params.set(PARAM_KEYS.toGamma, String(tp.gamma));
    params.set(PARAM_KEYS.toScale, String(tp.scale));
    params.set(PARAM_KEYS.toFrequency, String(tp.frequency));
    params.set(PARAM_KEYS.toContrast, String(tp.contrast));
    params.set(PARAM_KEYS.toSeed, String(tp.seed));
    params.set(PARAM_KEYS.toDirectionalNeighbors, String(tp.directionalNeighbors));
    params.set(PARAM_KEYS.toDirectionDensity, String(tp.directionDensity));
    params.set(PARAM_KEYS.toFillAmount, String(tp.fillAmount));
    params.set(PARAM_KEYS.toFillType, tp.fillType);
    params.set(PARAM_KEYS.toInvertFill, tp.invertFill ? '1' : '0');
  }

  // Text state params (only when state type is 'text')
  if (state.fromStateType === 'text') {
    params.set(PARAM_KEYS.fromStateType, 'text');
    const tc = state.fromTextConfig;
    // Text content URI-encoded, limited to 500 chars (newlines become %0A automatically)
    if (tc.text) params.set(PARAM_KEYS.fromText, tc.text.slice(0, 500));
    params.set(PARAM_KEYS.fromCharHeight, String(tc.charHeight));
    addIfChanged(PARAM_KEYS.fromAlignment, tc.alignment, DEFAULT_TEXT_CONFIG.alignment);
    addIfChanged(PARAM_KEYS.fromVerticalAlignment, tc.verticalAlignment, DEFAULT_TEXT_CONFIG.verticalAlignment);
    addIfChanged(PARAM_KEYS.fromWordWrap, tc.wordWrap ? '1' : '0', DEFAULT_TEXT_CONFIG.wordWrap ? '1' : '0');
    addIfChanged(PARAM_KEYS.fromInvert, tc.invert ? '1' : '0', DEFAULT_TEXT_CONFIG.invert ? '1' : '0');
    addIfChanged(PARAM_KEYS.fromFontResolution, tc.fontResolution, DEFAULT_TEXT_CONFIG.fontResolution);
  }

  // Logo (only when enabled, to keep URLs short)
  if (state.logoConfig.enabled) {
    params.set(PARAM_KEYS.logoEnabled, '1');
    addIfChanged(PARAM_KEYS.logoX, String(state.logoConfig.x), String(DEFAULTS.logoConfig.x));
    addIfChanged(PARAM_KEYS.logoY, String(state.logoConfig.y), String(DEFAULTS.logoConfig.y));
    addIfChanged(PARAM_KEYS.logoSize, String(state.logoConfig.size), String(DEFAULTS.logoConfig.size));
    addIfChanged(PARAM_KEYS.logoColor, state.logoConfig.color.replace('#', ''), DEFAULTS.logoConfig.color.replace('#', ''));
  }

  // Text overlay (only when enabled, to keep URLs short)
  if (state.textOverlayConfig.enabled && state.textOverlayConfig.entries.length > 0) {
    params.set(PARAM_KEYS.textOverlayEnabled, '1');
    for (let i = 0; i < state.textOverlayConfig.entries.length; i++) {
      const e = state.textOverlayConfig.entries[i];
      const prefix = `txo${i}`;
      if (e.content) params.set(`${prefix}c`, e.content.slice(0, 500));
      params.set(`${prefix}y`, String(e.y));
      params.set(`${prefix}fs`, String(e.fontSize));
      if (e.fontWeight !== 400) params.set(`${prefix}fw`, String(e.fontWeight));
      if (e.alignment !== 'center') params.set(`${prefix}a`, e.alignment);
      params.set(`${prefix}co`, e.color.replace('#', ''));
      if (e.lineHeight !== 1.4) params.set(`${prefix}lh`, String(e.lineHeight));
      if (e.sidePadding !== 0) params.set(`${prefix}sp`, String(e.sidePadding));
      if (e.zOrder !== 'above') params.set(`${prefix}z`, e.zOrder);
    }
  }

  // To text state (only when animation enabled and toStateType is 'text')
  if (state.animationEnabled && state.toStateType === 'text') {
    params.set(PARAM_KEYS.toStateType, 'text');
    const tc = state.toTextConfig;
    if (tc.text) params.set(PARAM_KEYS.toText, tc.text.slice(0, 500));
    params.set(PARAM_KEYS.toCharHeight, String(tc.charHeight));
    addIfChanged(PARAM_KEYS.toAlignment, tc.alignment, DEFAULT_TEXT_CONFIG.alignment);
    addIfChanged(PARAM_KEYS.toVerticalAlignment, tc.verticalAlignment, DEFAULT_TEXT_CONFIG.verticalAlignment);
    addIfChanged(PARAM_KEYS.toWordWrap, tc.wordWrap ? '1' : '0', DEFAULT_TEXT_CONFIG.wordWrap ? '1' : '0');
    addIfChanged(PARAM_KEYS.toInvert, tc.invert ? '1' : '0', DEFAULT_TEXT_CONFIG.invert ? '1' : '0');
    addIfChanged(PARAM_KEYS.toFontResolution, tc.fontResolution, DEFAULT_TEXT_CONFIG.fontResolution);
  }

  return params.toString();
}

const HEX_COLOR_REGEX = /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const VALID_FILL_TYPES: FillType[] = ['linear', 'radial', 'angular', 'diamond', 'square', 'box'];

function clampNum(val: string | null, min: number, max: number): number | undefined {
  if (val === null) return undefined;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

function parseBool(val: string | null): boolean | undefined {
  if (val === null) return undefined;
  return val === '1';
}

export function parseUrlToState(): Partial<UrlSerializableState> {
  const sp = new URLSearchParams(window.location.search);
  const result: Partial<UrlSerializableState> = {};

  // Numbers
  const t = clampNum(sp.get('t'), 0, 1);
  if (t !== undefined) result.threshold = t;

  const g = clampNum(sp.get('g'), 0.1, 3);
  if (g !== undefined) result.gamma = g;

  const sc = clampNum(sp.get('sc'), 0.25, 1.0);
  if (sc !== undefined) result.scale = sc;

  const f = clampNum(sp.get('f'), 0.01, 0.5);
  if (f !== undefined) result.frequency = f;

  const c = clampNum(sp.get('c'), 0.1, 3);
  if (c !== undefined) result.contrast = c;

  const s = clampNum(sp.get('s'), 0, 1);
  if (s !== undefined) result.seed = s;

  const dn = clampNum(sp.get('dn'), 0, 999);
  if (dn !== undefined) result.directionalNeighbors = Math.floor(dn);

  const dd = clampNum(sp.get('dd'), 0, 999);
  if (dd !== undefined) result.directionDensity = Math.floor(dd);

  const fa = clampNum(sp.get('fa'), 0, 100);
  if (fa !== undefined) result.fillAmount = Math.floor(fa);

  const w = clampNum(sp.get('w'), MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION);
  if (w !== undefined) result.canvasWidth = Math.round(w);

  const h = clampNum(sp.get('h'), MIN_CANVAS_DIMENSION, MAX_CANVAS_DIMENSION);
  if (h !== undefined) result.canvasHeight = Math.round(h);

  const cs = clampNum(sp.get('cs'), 2, MAX_CELL_SIZE);
  if (cs !== undefined) result.cellSize = Math.round(cs);

  // Enums
  const ft = sp.get('ft');
  if (ft !== null && VALID_FILL_TYPES.includes(ft as FillType)) {
    result.fillType = ft as FillType;
  }

  const cd = sp.get('cd');
  if (cd === 'width' || cd === 'height') {
    result.cropDirection = cd;
  }

  // Elongation
  const ea = sp.get(PARAM_KEYS.elongateAxis);
  if (ea === 'none' || ea === 'width' || ea === 'height') {
    result.elongateAxis = ea;
  }
  const em = clampNum(sp.get(PARAM_KEYS.elongateAmount), 1, 16);
  if (em !== undefined) result.elongateAmount = Math.round(em);

  const presetOrCustomMode = sp.get('pcm');
  if (presetOrCustomMode === 'presets' || presetOrCustomMode === 'custom') {
    result.presetOrCustomMode = presetOrCustomMode;
  }

  // Text color
  const tc = sp.get(PARAM_KEYS.textColor);
  if (tc !== null && HEX_COLOR_REGEX.test(tc)) {
    result.textColor = '#' + tc.toUpperCase();
  }

  // Booleans
  const invertFill = parseBool(sp.get('if'));
  if (invertFill !== undefined) result.invertFill = invertFill;

  const cr = parseBool(sp.get('cr'));
  if (cr !== undefined) result.allowCropping = cr;

  const ic = parseBool(sp.get('ic'));
  if (ic !== undefined) result.invertColors = ic;

  // Multi-color
  const cm = sp.get(PARAM_KEYS.colorMode);
  if (cm === 'duo' || cm === 'tri') {
    result.colorMode = cm;
    const mc = sp.get(PARAM_KEYS.multiColors);
    if (mc) {
      const parsed = mc.split(',').filter(c => HEX_COLOR_REGEX.test(c)).map(c => '#' + c.toUpperCase());
      if (parsed.length >= 2) result.multiColors = parsed;
    }
    const cp = sp.get(PARAM_KEYS.colorProportions);
    if (cp) {
      const parsed = cp.split(',').map(Number).filter(n => !isNaN(n) && n >= 0);
      if (parsed.length >= 2) {
        const total = parsed.reduce((a, b) => a + b, 0);
        result.colorProportions = parsed.map(p => p / total); // normalize to sum to 1
      }
    }
  }

  // Colors
  const fg = sp.get('fg');
  if (fg !== null && HEX_COLOR_REGEX.test(fg)) {
    result.foregroundColor = '#' + fg.toUpperCase();
  }

  const bg = sp.get('bg');
  if (bg !== null && HEX_COLOR_REGEX.test(bg)) {
    result.backgroundColor = '#' + bg.toUpperCase();
  }

  // Animation
  const ae = parseBool(sp.get('ae'));
  if (ae !== undefined) result.animationEnabled = ae;

  const ad = clampNum(sp.get('ad'), 100, 5000); // Min 0.1s, max 5s
  if (ad !== undefined) result.animationDuration = Math.round(ad);

  const se = parseBool(sp.get(PARAM_KEYS.showEndState));
  if (se !== undefined) result.showEndState = se;

  // To params (for animation)
  const toT = sp.get(PARAM_KEYS.toThreshold);
  if (toT !== null) {
    // If any toParam key exists, parse all of them
    const toParams: GeneratorParamsUrl = {
      threshold: clampNum(toT, 0, 1) ?? DEFAULTS.threshold,
      gamma: clampNum(sp.get(PARAM_KEYS.toGamma), 0.1, 3) ?? DEFAULTS.gamma,
      scale: clampNum(sp.get(PARAM_KEYS.toScale), 0.25, 1.0) ?? DEFAULTS.scale,
      frequency: clampNum(sp.get(PARAM_KEYS.toFrequency), 0.01, 0.5) ?? DEFAULTS.frequency,
      contrast: clampNum(sp.get(PARAM_KEYS.toContrast), 0.1, 3) ?? DEFAULTS.contrast,
      seed: clampNum(sp.get(PARAM_KEYS.toSeed), 0, 1) ?? Math.random(),
      directionalNeighbors: Math.floor(clampNum(sp.get(PARAM_KEYS.toDirectionalNeighbors), 0, 999) ?? DEFAULTS.directionalNeighbors),
      directionDensity: Math.floor(clampNum(sp.get(PARAM_KEYS.toDirectionDensity), 0, 999) ?? DEFAULTS.directionDensity),
      fillAmount: Math.floor(clampNum(sp.get(PARAM_KEYS.toFillAmount), 0, 100) ?? DEFAULTS.fillAmount),
      fillType: (VALID_FILL_TYPES.includes(sp.get(PARAM_KEYS.toFillType) as FillType)
        ? sp.get(PARAM_KEYS.toFillType) as FillType
        : DEFAULTS.fillType),
      invertFill: parseBool(sp.get(PARAM_KEYS.toInvertFill)) ?? DEFAULTS.invertFill,
    };
    result.toParams = toParams;
  }

  // Text state params - from state
  const fst = sp.get(PARAM_KEYS.fromStateType);
  if (fst === 'text') {
    result.fromStateType = 'text';
    const ftxt = sp.get(PARAM_KEYS.fromText);
    const fch = clampNum(sp.get(PARAM_KEYS.fromCharHeight), 5, 100);
    const fal = sp.get(PARAM_KEYS.fromAlignment);
    const fva = sp.get(PARAM_KEYS.fromVerticalAlignment);
    const fww = parseBool(sp.get(PARAM_KEYS.fromWordWrap));
    const fin = parseBool(sp.get(PARAM_KEYS.fromInvert));
    const ffr = sp.get(PARAM_KEYS.fromFontResolution);

    const fromResolution = (ffr === 'low' || ffr === 'mid' || ffr === 'high') ? ffr : DEFAULT_TEXT_CONFIG.fontResolution;
    const fromFontHeight = RESOLUTION_MIN_HEIGHT[fromResolution];
    const fromScale = Math.max(1, Math.round((fch ?? DEFAULT_TEXT_CONFIG.charHeight) / fromFontHeight));
    result.fromTextConfig = {
      text: ftxt ? ftxt.slice(0, 500) : '',
      charHeight: fromFontHeight * fromScale,
      alignment: (fal === 'left' || fal === 'center' || fal === 'right') ? fal : DEFAULT_TEXT_CONFIG.alignment,
      verticalAlignment: (fva === 'top' || fva === 'center' || fva === 'bottom') ? fva : DEFAULT_TEXT_CONFIG.verticalAlignment,
      wordWrap: fww ?? DEFAULT_TEXT_CONFIG.wordWrap,
      invert: fin ?? DEFAULT_TEXT_CONFIG.invert,
      fontResolution: fromResolution,
    };
  }

  // Text state params - to state
  const tst = sp.get(PARAM_KEYS.toStateType);
  if (tst === 'text') {
    result.toStateType = 'text';
    const ttxt = sp.get(PARAM_KEYS.toText);
    const tch = clampNum(sp.get(PARAM_KEYS.toCharHeight), 5, 100);
    const tal = sp.get(PARAM_KEYS.toAlignment);
    const tva = sp.get(PARAM_KEYS.toVerticalAlignment);
    const tww = parseBool(sp.get(PARAM_KEYS.toWordWrap));
    const tin = parseBool(sp.get(PARAM_KEYS.toInvert));
    const tfr = sp.get(PARAM_KEYS.toFontResolution);

    const toResolution = (tfr === 'low' || tfr === 'mid' || tfr === 'high') ? tfr : DEFAULT_TEXT_CONFIG.fontResolution;
    const toFontHeight = RESOLUTION_MIN_HEIGHT[toResolution];
    const toScale = Math.max(1, Math.round((tch ?? DEFAULT_TEXT_CONFIG.charHeight) / toFontHeight));
    result.toTextConfig = {
      text: ttxt ? ttxt.slice(0, 500) : '',
      charHeight: toFontHeight * toScale,
      alignment: (tal === 'left' || tal === 'center' || tal === 'right') ? tal : DEFAULT_TEXT_CONFIG.alignment,
      verticalAlignment: (tva === 'top' || tva === 'center' || tva === 'bottom') ? tva : DEFAULT_TEXT_CONFIG.verticalAlignment,
      wordWrap: tww ?? DEFAULT_TEXT_CONFIG.wordWrap,
      invert: tin ?? DEFAULT_TEXT_CONFIG.invert,
      fontResolution: toResolution,
    };
  }

  // Logo overlay
  const le = parseBool(sp.get(PARAM_KEYS.logoEnabled));
  if (le) {
    const lx = clampNum(sp.get(PARAM_KEYS.logoX), 0, 100);
    const ly = clampNum(sp.get(PARAM_KEYS.logoY), 0, 100);
    const ls = clampNum(sp.get(PARAM_KEYS.logoSize), 5, 50);
    const lc = sp.get(PARAM_KEYS.logoColor);
    result.logoConfig = {
      enabled: true,
      x: lx ?? DEFAULT_LOGO_CONFIG.x,
      y: ly ?? DEFAULT_LOGO_CONFIG.y,
      size: ls ?? 15,
      color: (lc && HEX_COLOR_REGEX.test(lc)) ? '#' + lc.toUpperCase() : '#FCFCFC',
    };
  }

  // Text overlay
  const txoe = parseBool(sp.get(PARAM_KEYS.textOverlayEnabled));
  if (txoe) {
    const entries: TextOverlayConfig['entries'] = [];
    for (let i = 0; i < 5; i++) {
      const prefix = `txo${i}`;
      const content = sp.get(`${prefix}c`);
      const y = sp.get(`${prefix}y`);
      if (content === null && y === null) break;

      const fw = Number(sp.get(`${prefix}fw`) ?? 400);
      const al = sp.get(`${prefix}a`);
      const co = sp.get(`${prefix}co`);
      const lh = clampNum(sp.get(`${prefix}lh`), 0.5, 3.0);
      const spVal = clampNum(sp.get(`${prefix}sp`), 0, 40);
      const z = sp.get(`${prefix}z`);

      entries.push({
        id: crypto.randomUUID(),
        content: content ? content.slice(0, 500) : '',
        y: clampNum(y, 0, 100) ?? 50,
        fontSize: clampNum(sp.get(`${prefix}fs`), 0.5, 50) ?? 5,
        fontWeight: isValidFontWeight(fw) ? fw : 400,
        alignment: (al === 'left' || al === 'center' || al === 'right') ? al : 'center',
        color: (co && HEX_COLOR_REGEX.test(co)) ? '#' + co.toUpperCase() : '#FCFCFC',
        lineHeight: lh ?? 1.4,
        sidePadding: spVal ?? 0,
        zOrder: z === 'behind' ? 'behind' : 'above',
      });
    }
    if (entries.length > 0) {
      result.textOverlayConfig = { enabled: true, entries };
    }
  }

  return result;
}

export function updateUrlFromState(state: UrlSerializableState): void {
  const queryString = serializeStateToUrl(state);
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

export function clearUrlParams(): void {
  window.history.replaceState(null, '', window.location.pathname);
}
