import { type FillType } from '../implementation-files/generateFragmentSvg';
import type { TextConfig } from '../implementation-files/generateTextGrid';
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
  foregroundColor: string;
  backgroundColor: string;
  invertColors: boolean;
  animationEnabled: boolean;
  animationDuration: number; // milliseconds
  toParams: GeneratorParamsUrl | null;
  // State types for pattern/text switching (defaults to 'pattern' when absent)
  fromStateType: StateType;
  toStateType: StateType;
  // Text configurations (only relevant when state type is 'text')
  fromTextConfig: TextConfig;
  toTextConfig: TextConfig;
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
  foregroundColor: 'fg',
  backgroundColor: 'bg',
  invertColors: 'ic',
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
} as const;

// Default text configuration
const DEFAULT_TEXT_CONFIG: TextConfig = {
  text: '',
  charHeight: 15,
  alignment: 'center',
  verticalAlignment: 'center',
  wordWrap: true,
  invert: false,
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
  foregroundColor: '#FCFCFC',
  backgroundColor: '#000000',
  invertColors: false,
  animationEnabled: false,
  animationDuration: 600, // 600ms = 0.6s
  toParams: null,
  fromStateType: 'pattern',
  toStateType: 'pattern',
  fromTextConfig: DEFAULT_TEXT_CONFIG,
  toTextConfig: DEFAULT_TEXT_CONFIG,
};

export function serializeStateToUrl(state: UrlSerializableState): string {
  const params = new URLSearchParams();

  const addIfChanged = (key: string, value: string, defaultValue: string) => {
    if (value !== defaultValue) params.set(key, value);
  };

  // Numbers — only include if different from default
  addIfChanged(PARAM_KEYS.threshold, String(state.threshold), String(DEFAULTS.threshold));
  addIfChanged(PARAM_KEYS.gamma, String(state.gamma), String(DEFAULTS.gamma));
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

  // Colors: strip '#'
  addIfChanged(PARAM_KEYS.foregroundColor, state.foregroundColor.replace('#', ''), DEFAULTS.foregroundColor.replace('#', ''));
  addIfChanged(PARAM_KEYS.backgroundColor, state.backgroundColor.replace('#', ''), DEFAULTS.backgroundColor.replace('#', ''));

  // Animation
  addIfChanged(PARAM_KEYS.animationEnabled, state.animationEnabled ? '1' : '0', DEFAULTS.animationEnabled ? '1' : '0');
  addIfChanged(PARAM_KEYS.animationDuration, String(state.animationDuration), String(DEFAULTS.animationDuration));

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

  // Booleans
  const invertFill = parseBool(sp.get('if'));
  if (invertFill !== undefined) result.invertFill = invertFill;

  const cr = parseBool(sp.get('cr'));
  if (cr !== undefined) result.allowCropping = cr;

  const ic = parseBool(sp.get('ic'));
  if (ic !== undefined) result.invertColors = ic;

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
