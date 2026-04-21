/**
 * Reads marketing-icp-website fragment JSON exports and writes
 * src/app/components/fragment/blogMarketingPresets.data.json
 *
 * Usage: node scripts/generate-blog-marketing-presets.mjs
 * Requires: ../marketing-icp-website (sibling repo) with src/data/fragments/*.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const marketingFragments = path.resolve(
  repoRoot,
  '../marketing-icp-website/src/data/fragments',
);
const outJson = path.join(repoRoot, 'src/app/components/fragment/blogMarketingPresets.data.json');
const marketingPublic = path.resolve(repoRoot, '../marketing-icp-website/public');
const blogPresetImagesOut = path.join(repoRoot, 'public/blog-presets');

const FILE_META = {
  '10-reasons-the-internet-computer-will-win.json': { label: 'Ice Decimal', value: 'blog-10-reasons' },
  'bringing-llms-to-the-internet-computer.json': { label: 'Radial Ledger', value: 'blog-bringing-llms' },
  'from-decentralization-to-ai-world-computer-tech-talks-recap.json': {
    label: 'Amethyst Horizon',
    value: 'blog-decentralization-ai',
  },
  'icp-connecting-bitcoin-ethereum-and-now-solana.json': { label: 'Solana Mint Field', value: 'blog-icp-chains' },
  'icp-reaches-the-shores-of-solana.json': { label: 'Violet Tide', value: 'blog-icp-solana-shores' },
  'internet-computer-20-dfnity-20-and-caffeineself-writing.json': { label: 'Quartz Carnival', value: 'blog-ic20-quad' },
  'internet-identity-20-the-new-user-experience.json': { label: 'Obsidian Badge', value: 'blog-ii-20' },
  'introducing-arm-your-autonomous-and-smart-defi-companion.json': { label: 'Teal Sentinel', value: 'blog-arm-defi' },
  'onchain-privacy-in-action-a-guide-to-vetkeys-use-cases.json': { label: 'Magenta Vault', value: 'blog-vetkeys-guide' },
  'preventing-reentrancy-bugs-from-creeping-back-in-linking-tla-models-to-rust-code.json': {
    label: 'Steel Proof',
    value: 'blog-reentrancy-tla',
  },
  'real-time-transparency-with-public-api-boundary-node-access-logs.json': { label: 'Glass Node', value: 'blog-boundary-logs' },
  'the-bitcoin-defi-renaissance.json': { label: 'Emerald Renaissance', value: 'blog-btc-defi' },
  'the-history-of-the-internet-computer-in-10-steps.json': { label: 'Inverted Chronicle', value: 'blog-history-10' },
  'the-internet-computers-fourth-anniversary-a-year-in-review-and-the-road-ahead.json': {
    label: 'Royal Retrospective',
    value: 'blog-icp-4th-anniversary',
  },
  'the-internet-computers-privacy-era-vetkeys-unlocked.json': { label: 'Deep Sea Keys', value: 'blog-vetkeys-unlocked' },
  'who-controls-your-digital-life.json': { label: 'Forest Signal', value: 'blog-digital-life' },
  'who-owns-your-cloud-cloud-engines-intro.json': { label: 'Arctic Engine', value: 'blog-cloud-engines' },
  'why-icp-is-essential.json': { label: 'Core Thesis', value: 'blog-why-icp' },
};

const DEFAULT_TEXT = {
  text: '',
  charHeight: 14,
  alignment: 'center',
  verticalAlignment: 'center',
  wordWrap: true,
  invert: false,
  fontResolution: 'mid',
};

function paramsFrom(c) {
  return {
    threshold: c.threshold,
    gamma: c.gamma,
    scale: 1,
    frequency: c.frequency,
    contrast: c.contrast,
    seed: c.seed,
    directionalNeighbors: c.directionalNeighbors,
    directionDensity: c.directionDensity,
    fillAmount: c.fillAmount,
    fillType: c.fillType,
    invertFill: c.invertFill,
  };
}

function cellForUi(c) {
  return Math.max(8, Math.round((c.cellSize ?? 80) * 400 / 2160));
}

function mergeText(t) {
  if (!t) return { ...DEFAULT_TEXT };
  return { ...DEFAULT_TEXT, ...t };
}

function normalizeLogo(logo, presetValue) {
  if (!logo?.enabled || !Array.isArray(logo.entries) || logo.entries.length === 0) {
    return { enabled: false, entries: [] };
  }
  return {
    enabled: true,
    entries: logo.entries.map((e, i) => ({
      id: e.id ?? `${presetValue}-logo-${i}`,
      logoId: e.logoId,
      x: e.x,
      y: e.y,
      size: e.size,
      color: e.color,
      colorSource: e.colorSource,
    })),
  };
}

function normalizeImageOverlay(img) {
  if (!img?.enabled) return undefined;
  const raw = img.data ?? '';
  const name = raw.startsWith('/') ? raw.slice(1) : raw;
  const publicPath = `/blog-presets/${name}`;
  return {
    enabled: true,
    data: publicPath,
    originalWidth: img.originalWidth,
    originalHeight: img.originalHeight,
    fit: img.fit ?? 'contain',
    size: img.size ?? 100,
    x: img.x ?? 50,
    y: img.y ?? 50,
    overlayLayerOrder: img.overlayLayerOrder ?? ['cells', 'image', 'text', 'logo'],
  };
}

function customizationFor(j, presetValue) {
  const logo = normalizeLogo(j.logo, presetValue);
  const hasLogo = logo.enabled;
  const hasText = j.textOverlay?.enabled && (j.textOverlay.entries?.length ?? 0) > 0;
  const hasImage = j.imageOverlay?.enabled && !!j.imageOverlay?.data;

  const base = {
    colors: true,
    lockedColors: ['invertColors'],
    parameters: true,
    lockedParams: [
      'threshold',
      'gamma',
      'contrast',
      'fillAmount',
      'fillType',
      'invertFill',
      'directionalNeighbors',
      'directionDensity',
    ],
    stateTypeLocked: true,
  };
  if (hasLogo) Object.assign(base, { logo: true });
  if (hasText) Object.assign(base, { textOverlay: true });
  if (hasImage) Object.assign(base, { image: true });
  return base;
}

function buildPreset(filename, j) {
  const meta = FILE_META[filename];
  if (!meta) throw new Error(`Unknown fragment file: ${filename}`);
  const presetValue = meta.value;
  const cfg = j.config;
  const to = j.toConfig;
  const cell = cellForUi(cfg);
  const elongateAxis = cfg.elongateAxis ?? 'none';
  const elongateAmount = cfg.elongateAmount ?? 1;
  const logoConfig = normalizeLogo(j.logo, presetValue);
  const textOverlayConfig = j.textOverlay?.enabled ? j.textOverlay : undefined;
  const imageOverlayConfig = normalizeImageOverlay(j.imageOverlay);

  const preset = {
    label: meta.label,
    value: presetValue,
    customization: customizationFor(j, presetValue),
    canvasWidth: 700,
    canvasHeight: 400,
    cellSize: cell,
    allowCropping: cfg.allowCropping ?? false,
    cropDirection: 'height',
    elongateAxis,
    elongateAmount,
    foregroundColor: cfg.foregroundColor,
    backgroundColor: cfg.backgroundColor,
    invertColors: cfg.invertColors ?? false,
    animationEnabled: true,
    animationDuration: j.animation?.duration ?? 400,
    logoConfig,
    fromStateType: j.fromStateType === 'text' ? 'text' : 'pattern',
    params: paramsFrom(cfg),
    fromTextConfig: mergeText(j.fromTextConfig),
    toStateType: j.toStateType === 'text' ? 'text' : 'pattern',
    toParams: paramsFrom(to),
    toTextConfig: mergeText(j.toTextConfig),
  };

  if (cfg.colorMode) preset.colorMode = cfg.colorMode;
  if (cfg.colors) preset.multiColors = cfg.colors;
  if (cfg.colorProportions) preset.colorProportions = cfg.colorProportions;
  if (cfg.textColor) preset.textColor = cfg.textColor;
  if (textOverlayConfig) preset.textOverlayConfig = textOverlayConfig;
  if (imageOverlayConfig) preset.imageOverlayConfig = imageOverlayConfig;

  return preset;
}

if (!fs.existsSync(marketingFragments)) {
  console.error('Missing marketing fragments dir:', marketingFragments);
  process.exit(1);
}

const presets = Object.keys(FILE_META)
  .sort((a, b) => FILE_META[a].label.localeCompare(FILE_META[b].label))
  .map((filename) => {
    const full = path.join(marketingFragments, filename);
    const j = JSON.parse(fs.readFileSync(full, 'utf8'));
    return buildPreset(filename, j);
  });

fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(presets, null, 2));
console.log('Wrote', outJson, `(${presets.length} presets)`);

// Copy raster assets referenced by fragment exports (paths like /001-FG-Blog.webp).
const referenced = new Set();
for (const p of presets) {
  const d = p.imageOverlayConfig?.data;
  if (d && d.startsWith('/blog-presets/')) {
    referenced.add(path.basename(d));
  }
}
if (referenced.size > 0 && fs.existsSync(marketingPublic)) {
  fs.mkdirSync(blogPresetImagesOut, { recursive: true });
  for (const name of referenced) {
    const src = path.join(marketingPublic, name);
    const dest = path.join(blogPresetImagesOut, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Copied image', name, '→ public/blog-presets/');
    } else {
      console.warn('Missing source image (add to marketing public/):', src);
    }
  }
}
