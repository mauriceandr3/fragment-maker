# Text Overlay Feature Plan

## Overview

Add support for regular (non-pixelated) text overlays on top of (or behind) the fragment pattern. This is independent of the existing cell-based pixelated text feature, which morphs text into/from the pattern grid. Text overlays are static elements — like the logo overlay — that exist apart from the pattern animation.

**Use case example:** A social media card with an animated fragment pattern at the top, and a heading + body text in the center that remains unchanged during animation. Or: a pattern that animates outward from the center, revealing text behind it.

## Naming

- **Feature name:** "Text Overlay"
- **Types:** `TextOverlayEntry`, `TextOverlayConfig`
- **UI panel:** Own section, sibling to Logo panel (not nested under it)

**Why not just "text"?** The existing `TextConfig` type handles cell-based pixelated text that IS the pattern. "Text Overlay" clearly distinguishes this as an independent layer on top of (or behind) the pattern. In code, the `TextOverlay` prefix avoids any ambiguity with the existing text system.

## Data Model

```ts
interface TextOverlayEntry {
  id: string                              // unique id for React keys and ordering
  content: string                         // the text to display
  y: number                               // 0–100% vertical position
  fontSize: number                        // % of canvas height
  fontWeight: 400 | 500 | 600 | 700      // Inter weight presets
  alignment: 'left' | 'center' | 'right' // horizontal alignment
  color: string                           // hex color, e.g. '#29ABE2'
  lineHeight: number                      // multiplier, default 1.4
  zOrder: 'above' | 'behind'             // relative to the pattern layer
}

interface TextOverlayConfig {
  enabled: boolean
  entries: TextOverlayEntry[]             // max 5 entries
}
```

### Design decisions

- **Y-axis only positioning.** Each text block spans the full canvas width. Horizontal placement is controlled via `alignment` (left/center/right). No per-block x position or max-width — the canvas width IS the max width. If text is longer than the width, it wraps.
- **No x-axis position.** Unnecessary given full-width blocks with alignment. Keeps the UI simpler.
- **No configurable max-width per block.** The canvas edge is the boundary. Word wrap happens at the canvas edge. This is simpler and covers the use cases shown in the reference image.
- **Font weight presets** (400, 500, 600, 700) rather than the full 100–900 range. Fewer choices = faster decisions for users, and these four cover the practical range (regular, medium, semi-bold, bold).
- **Line height** exposed per-block. Letter spacing deferred to a future enhancement if needed.
- **Max 5 text blocks.** Sufficient for realistic layouts (the reference image uses 2). Prevents UI clutter.
- **Z-order per block** (`above` or `behind` pattern). This enables the "reveal" effect: text placed behind the pattern becomes visible as pattern cells animate away from the center. Combined with a transparent background, this is especially effective.

### Defaults

```ts
const DEFAULT_TEXT_OVERLAY_CONFIG: TextOverlayConfig = {
  enabled: false,
  entries: [],
};

// When adding a new entry:
const DEFAULT_TEXT_OVERLAY_ENTRY: Omit<TextOverlayEntry, 'id'> = {
  content: '',
  y: 50,
  fontSize: 5,
  fontWeight: 400,
  alignment: 'center',
  color: '#FCFCFC',
  lineHeight: 1.4,
  zOrder: 'above',
};
```

## Rendering Layers (bottom to top)

1. Background color
2. Text overlays with `zOrder: 'behind'`
3. Pattern cells (animated or static)
4. Text overlays with `zOrder: 'above'`
5. Logo

The logo is always on top. Its z-order relative to text overlays is not user-configurable — in practice, users won't overlap text and logo, so this doesn't matter.

## Rendering Strategy Per Context

| Context | How text renders | Why |
|---|---|---|
| **App preview** | HTML elements, absolutely positioned (like logo overlay) | Fast, uses browser font rendering, no conversion needed |
| **SVG export** | Vectorized `<path>` elements via opentype.js | Self-contained SVG with exact rendering, no font dependency for the consumer |
| **Video export** | `ctx.fillText()` on canvas with Inter font loaded | Video export happens entirely in the app where the font is loaded; no vectorization needed |
| **Config JSON export** | Both raw text config AND pre-computed SVG path data | Implementers get exact paths for guaranteed rendering, plus raw text if they want to customize |
| **Bundle implementation** | `generateSvgFromExport()` renders paths from config JSON | Consumers get WYSIWYG without needing to load Inter |

### Why vectorize for SVG/config exports?

SVG `<text>` elements depend on the font being available at render time. If the implementer doesn't have Inter loaded, the browser substitutes a system font and the result looks different. Vectorized `<path>` elements render identically everywhere with zero font dependencies. This is the "no surprises" approach.

### Why NOT vectorize for video export?

Video export happens entirely within the app, where Inter is already loaded. `ctx.fillText()` is simpler and produces identical results. There's no downstream consumer who might lack the font.

### Trade-offs of vectorization

- **Pro:** Exact rendering everywhere, no font dependency, truly self-contained SVGs
- **Con:** Larger file size (a heading ≈ 2–5KB of path data, a paragraph ≈ 20–50KB), text is no longer editable/searchable in exported SVGs
- **Dismissed alternative:** Embedding Inter font subset as base64 in SVGs — even larger than paths and adds complexity
- **Dismissed alternative:** Plain `<text>` elements with no font embedding — breaks the "what you export is what you get" guarantee

## Font

**Inter** — loaded as a static asset in the app. Two uses:
1. **CSS `@font-face`** (woff2) for app preview and video export canvas rendering
2. **opentype.js** parses the .ttf/.otf file at export time to generate SVG path data

The opentype.js dependency (~200KB) is app-only. It is NOT included in the implementation bundle — the bundle only renders pre-computed paths from the config JSON.

## Implementation Architecture

Following the same pattern as the logo feature:

### 1. Core implementation file

New file: `src/implementation-files/textOverlay.ts`

Contains:
- `TextOverlayEntry` and `TextOverlayConfig` type definitions
- `generateTextOverlaySvg(entries, canvasWidth, canvasHeight, position: 'behind' | 'above')` — returns SVG string with `<path>` elements for entries matching the given z-order position
- Helper to compute y-position, alignment, and word-wrap boundaries in SVG coordinates

This file gets bundled (it's in `implementation-files/`). It only handles rendering pre-computed paths — no opentype.js dependency.

### 2. Path conversion (app-only)

New file: `src/lib/textVectorizer.ts` (or similar)

Contains:
- opentype.js integration
- `vectorizeTextOverlay(entry, canvasWidth, canvasHeight)` → SVG path data
- Font loading and caching
- Called at export time only (SVG export, config JSON export)

This file is NOT bundled — it's app-only infrastructure.

### 3. UI panel

New file: `src/app/components/fragment/TextOverlayPanel.tsx`

Controls per entry:
- Text input (textarea)
- Y position slider (0–100%)
- Font size slider (% of canvas height)
- Font weight selector (preset buttons: Regular, Medium, Semi-Bold, Bold)
- Alignment buttons (left, center, right)
- Color input with "use foreground color" convenience button
- Line height slider (e.g. 1.0–2.0, default 1.4)
- Z-order toggle (above/behind pattern)
- Add/remove entry buttons (max 5)

### 4. Integration points

- **URL state** (`urlState.ts`): Serialize text overlay config with short keys (e.g. `toe`=enabled, `to0c`=entry 0 content, `to0y`=entry 0 y, etc.)
- **Fragment state** (`useFragmentState.ts`): Add `textOverlayConfig` to state
- **Export JSON** (`useFragmentActions.ts`): Include text overlay config + pre-computed paths in export when enabled. Bump version.
- **Import JSON** (`useFragmentActions.ts`): Deserialize text overlay config with validation/clamping
- **SVG generation** (`generateFragmentSvg.ts`): Call `generateTextOverlaySvg()` at appropriate layer positions (behind pattern cells and/or above them)
- **Preview** (`PreviewPanel.tsx`): Render HTML text overlays absolutely positioned over the SVG, like the logo overlay
- **Video export** (`useVideoExport.ts`): Draw text using `ctx.fillText()` at correct positions, respecting z-order (draw "behind" entries before pattern, "above" entries after)
- **Bundle script** (`scripts/bundle.mjs`): Add `textOverlay.ts` to bundled files

### 5. README update

Add implementation instructions for the text overlay variant, similar to existing logo documentation. Document:
- How text overlay data appears in the config JSON
- How `generateSvgFromExport()` automatically renders text overlays from path data
- How to access raw text config if the implementer wants to render text themselves

## Config JSON Export Format

```json
{
  "version": "2.4.0",
  "exportedAt": "2026-03-12T...",
  "config": { "..." },
  "logo": { "..." },
  "textOverlay": {
    "enabled": true,
    "entries": [
      {
        "id": "abc123",
        "content": "Mission 70",
        "y": 35,
        "fontSize": 4,
        "fontWeight": 500,
        "alignment": "center",
        "color": "#29ABE2",
        "lineHeight": 1.4,
        "zOrder": "above",
        "paths": [
          {
            "d": "M10.5 0L12.3 5.2L18...",
            "transform": "translate(120, 350)"
          }
        ]
      },
      {
        "id": "def456",
        "content": "Is there a cheaper\nalternative for large data\nstorage?",
        "y": 55,
        "fontSize": 7,
        "fontWeight": 400,
        "alignment": "center",
        "color": "#29ABE2",
        "lineHeight": 1.4,
        "zOrder": "above",
        "paths": [
          {
            "d": "M5.2 0L8.1 3.4...",
            "transform": "translate(80, 520)"
          }
        ]
      }
    ]
  }
}
```

The `paths` array contains pre-computed SVG path data generated by opentype.js at export time. Each path entry includes the `d` attribute and a `transform` for positioning. The raw text fields (`content`, `y`, `fontSize`, etc.) are preserved alongside paths so implementers can choose which to use.

## Word Wrap

Word wrap is always enabled. The wrapping boundary is the canvas width. In the app preview, this is handled naturally by CSS on the HTML text elements. For vectorization (SVG/config export), the text vectorizer must:

1. Measure each word's width using opentype.js
2. Break lines when accumulated width exceeds canvas width
3. Generate paths for each line, positioned according to alignment and line height

This is the main complexity in the vectorizer — it essentially reimplements text layout. opentype.js provides glyph metrics for width measurement, so this is feasible.

## Implementation Task List

### Phase 1: Foundation — Types, Font, and Core Rendering

This phase sets up the data model, installs dependencies, and creates the core implementation file that gets bundled for consumers.

#### 1.1 Install dependencies

- [x] `npm install opentype.js` (and `@types/opentype.js` if available, or add ambient types)
- [x] Download Inter font files: `.woff2` for CSS `@font-face`, `.ttf` or `.otf` for opentype.js parsing
- [x] Place font files in `public/fonts/` (or similar static asset directory)

#### 1.2 Add Inter font to the app

- [x] Add `@font-face` declaration for Inter (weights 400, 500, 600, 700) in CSS
- [x] Verify font loads correctly in the app (check devtools Network tab) — deferred to Phase 10

#### 1.3 Define types

- [x] Add `TextOverlayEntry` and `TextOverlayConfig` interfaces to `src/implementation-files/textOverlay.ts`
- [x] Add `DEFAULT_TEXT_OVERLAY_CONFIG` and `DEFAULT_TEXT_OVERLAY_ENTRY` constants
- [x] Re-export types from `src/app/components/fragment/types.ts` (following the pattern used for `LogoConfig`)

```ts
// types.ts additions
export type { TextOverlayEntry, TextOverlayConfig } from '@/implementation-files/textOverlay';
export { DEFAULT_TEXT_OVERLAY_CONFIG } from '@/implementation-files/textOverlay';
```

#### 1.4 Create core implementation file: `src/implementation-files/textOverlay.ts`

This file gets bundled. It renders pre-computed path data from the config JSON — NO opentype.js dependency.

- [x] Type definitions (`TextOverlayEntry`, `TextOverlayConfig`, `TextOverlayPathData`)
- [x] `generateTextOverlaySvg(config, canvasWidth, canvasHeight, position: 'behind' | 'above')` — filters entries by zOrder, renders `<path>` elements positioned in SVG coordinate space. Returns SVG string fragment (not a full SVG document).

```ts
// Sketch of the core rendering function
export function generateTextOverlaySvg(
  config: TextOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
  position: 'behind' | 'above',
): string {
  if (!config.enabled) return '';

  const entries = config.entries.filter(e => e.zOrder === position);
  if (entries.length === 0) return '';

  return entries.map(entry => {
    if (!entry.paths?.length) return '';
    const paths = entry.paths
      .map(p => `<path d="${p.d}" fill="${entry.color}" transform="${p.transform}"/>`)
      .join('');
    return `<g>${paths}</g>`;
  }).join('');
}
```

### Phase 2: Text Vectorizer (App-Only)

This phase builds the opentype.js integration that converts text to SVG paths at export time.

#### 2.1 Create `src/lib/textVectorizer.ts`

This file is NOT bundled. It's app-only infrastructure for export-time path conversion.

- [x] Load and cache the Inter font file via opentype.js
- [x] Implement `vectorizeTextEntry(entry, canvasWidth, canvasHeight)` → `TextOverlayPathData[]`
  - Convert `fontSize` (% of canvas height) to absolute pixel size
  - Convert `y` (% position) to absolute y coordinate
  - Implement word wrap: measure word widths via `font.getAdvanceWidth()`, break at canvas width
  - Handle horizontal alignment (left/center/right) by computing x offset per line
  - Handle line height (multiply `fontSize * lineHeight` for line spacing)
  - For each line: use `font.getPath(text, x, y, fontSize)` to get path commands
  - Convert opentype.js path to SVG `d` attribute string
- [x] Implement `vectorizeAllEntries(config, canvasWidth, canvasHeight)` → config with paths populated

```ts
// Sketch of the vectorizer
import opentype from 'opentype.js';

let fontCache: opentype.Font | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (fontCache) return fontCache;
  fontCache = await opentype.load('/fonts/Inter.ttf');
  return fontCache;
}

export async function vectorizeTextEntry(
  entry: TextOverlayEntry,
  canvasWidth: number,
  canvasHeight: number,
): Promise<TextOverlayPathData[]> {
  const font = await loadFont();
  const absFontSize = (entry.fontSize / 100) * canvasHeight;
  const absY = (entry.y / 100) * canvasHeight;
  const absLineHeight = absFontSize * entry.lineHeight;

  // Word wrap
  const lines = wrapText(font, entry.content, absFontSize, canvasWidth);

  // Generate paths per line
  return lines.map((line, i) => {
    const lineY = absY + i * absLineHeight;
    const lineWidth = font.getAdvanceWidth(line, absFontSize);
    const lineX = computeAlignmentX(entry.alignment, lineWidth, canvasWidth);

    const path = font.getPath(line, lineX, lineY, absFontSize, {
      features: { liga: true, kern: true },
    });
    return {
      d: path.toPathData(2), // 2 decimal places
      transform: '', // position already baked into path coordinates
    };
  });
}
```

#### 2.2 Word wrap implementation

- [x] `wrapText(font, text, fontSize, maxWidth)` → `string[]`
  - Split on explicit newlines first
  - For each line, split into words, accumulate width via `font.getAdvanceWidth()`
  - Break when accumulated width + space + next word exceeds `maxWidth`
  - Handle edge case: single word longer than `maxWidth` (don't break mid-word, just overflow)

### Phase 3: State Management & URL Serialization

Wire the text overlay config into the app's state system.

#### 3.1 Add to URL state (`src/lib/urlState.ts`)

- [x] Add `textOverlayConfig` to `UrlSerializableState` interface
- [x] Define short URL param keys. Since entries are an array (max 5), use indexed keys:
  - `txoe` = text overlay enabled (boolean)
  - `txo{i}c` = entry i content (string, URI-encoded)
  - `txo{i}y` = entry i y position (number)
  - `txo{i}fs` = entry i font size (number)
  - `txo{i}fw` = entry i font weight (number)
  - `txo{i}a` = entry i alignment (string)
  - `txo{i}co` = entry i color (hex without #)
  - `txo{i}lh` = entry i line height (number)
  - `txo{i}z` = entry i z-order (string)
- [x] Add serialization logic in `serializeStateToUrl()` — only include when enabled, skip default values
- [x] Add deserialization logic in `parseUrlToState()` — reconstruct entries array from indexed params, with validation/clamping

#### 3.2 Add to fragment state (`src/hooks/useFragmentState.ts`)

- [x] Import `TextOverlayConfig` and `DEFAULT_TEXT_OVERLAY_CONFIG`
- [x] Add `textOverlayConfig` state: `useState<TextOverlayConfig>(initialUrlState.textOverlayConfig ?? { ...DEFAULT_TEXT_OVERLAY_CONFIG })`
- [x] Add `debouncedTextOverlayConfig` with debounce effect (same pattern as `logoConfig`)
- [x] Add to URL sync effect's state object
- [x] Add to the return object (state + setter + debounced value)

### Phase 4: UI Panel

Build the configuration panel for text overlays.

#### 4.1 Create `src/app/components/fragment/TextOverlayPanel.tsx`

- [x] Panel header with enable/disable checkbox (same pattern as LogoPanel)
- [x] "Add text block" button (disabled when 5 entries exist)
- [x] For each entry, a collapsible section with:
  - [x] Text textarea (content input)
  - [x] Y position slider (0–100%)
  - [x] Font size slider (% of canvas height, reasonable range e.g. 1–20%)
  - [x] Font weight preset buttons: Regular (400), Medium (500), Semi-Bold (600), Bold (700)
  - [x] Alignment buttons: left, center, right (reuse pattern from TextConfigPanel if a shared component exists)
  - [x] Color input with hex field + "Use foreground" button (same pattern as LogoPanel)
  - [x] Line height slider (1.0–2.5, step 0.1, default 1.4)
  - [x] Z-order toggle: "Above pattern" / "Behind pattern"
  - [x] Delete entry button
- [x] Reorder support (move up/down buttons, or drag — move buttons are simpler to start)

#### 4.2 Integrate panel into main layout

- [x] Add `TextOverlayPanel` to `AssetGenerator.tsx` (or wherever LogoPanel is rendered)
- [x] Position it as a sibling section to the Logo panel
- [x] Pass `textOverlayConfig` and `setTextOverlayConfig` from fragment state

### Phase 5: Preview Rendering

Show text overlays in the live preview using HTML elements.

#### 5.1 Add text overlay to `PreviewPanel.tsx`

- [x] Create a `TextOverlayPreview` component (or inline in PreviewPanel)
- [x] For each enabled entry: render an absolutely positioned `<div>` over the SVG preview
  - `fontFamily: 'Inter, sans-serif'`
  - `fontSize` computed from entry % × preview container height
  - `fontWeight` from entry
  - `color` from entry
  - `textAlign` from entry alignment
  - `top` from entry y% (CSS percentage)
  - `width: 100%` (full canvas width, alignment handles horizontal position)
  - `lineHeight` from entry
  - `wordWrap: break-word`, `overflowWrap: break-word`
  - `whiteSpace: pre-wrap` (preserves explicit newlines)
- [x] Handle z-order:
  - "above" entries: render on top of the SVG (same layer as logo, but below logo)
  - "behind" entries: render behind the SVG. This requires the SVG/pattern container to have a transparent area or the entry to be visually behind. Implementation: render behind-entries as a layer between the background div and the SVG element using z-index or DOM ordering.
- [x] Ensure preview updates live as the user edits text overlay config (no export-time vectorization in preview)

### Phase 6: SVG Export Integration

Make exported SVGs include vectorized text overlays.

#### 6.1 Integrate vectorizer into SVG export flow

- [x] In `useFragmentActions.ts` → `exportToSVG()`:
  - Before generating SVG string, call `vectorizeAllEntries()` to compute paths
  - Pass the path-populated config to `generateSvgFromExport()` (or inject afterward)
- [x] In `generateFragmentSvg.ts` → `generateSvgFromExport()`:
  - Call `generateTextOverlaySvg(config, width, height, 'behind')` — insert SVG fragment BEFORE the pattern cells
  - Call `generateTextOverlaySvg(config, width, height, 'above')` — insert SVG fragment AFTER the pattern cells but BEFORE the logo
- [x] Same for `generateDiffSvgFromExport()` (animated SVG variant)

```ts
// Sketch of integration in generateSvgFromExport
function generateSvgFromExport(exportData: FragmentExport): string {
  // ... existing pattern generation ...

  const behindText = generateTextOverlaySvg(exportData.textOverlay, width, height, 'behind');
  const aboveText = generateTextOverlaySvg(exportData.textOverlay, width, height, 'above');
  const logo = generateLogoOverlaySvg(exportData.logo, width, height);

  // Layer order in SVG DOM:
  // 1. background rect
  // 2. behindText
  // 3. pattern cells
  // 4. aboveText
  // 5. logo
  return `<svg ...>${backgroundRect}${behindText}${patternCells}${aboveText}${logo}</svg>`;
}
```

#### 6.2 Clipboard export (copy to clipboard / Figma paste)

- [x] Same vectorization step as SVG export — the clipboard SVG should include the text overlay paths

### Phase 7: Config JSON Export/Import

Include text overlay data in the configuration export file.

#### 7.1 Export (`useFragmentActions.ts` → `exportSettingsAsJson()`)

- [x] Bump export version to `'2.4.0'`
- [x] When `textOverlayConfig.enabled` is true:
  - Call `vectorizeAllEntries()` to compute paths for all entries
  - Include `textOverlay` field in export JSON with both raw config and computed paths (see Config JSON Export Format section above)
- [x] When disabled: omit `textOverlay` field (keep export small)

#### 7.2 Import (`useFragmentActions.ts` → `importSettingsFromJson()`)

- [x] Parse `textOverlay` field from JSON if present
- [x] Validate and clamp all entry values:
  - `y`: clamp 0–100
  - `fontSize`: clamp to reasonable range (e.g. 0.5–50)
  - `fontWeight`: must be one of 400/500/600/700, default 400
  - `alignment`: must be 'left'/'center'/'right', default 'center'
  - `color`: validate hex format
  - `lineHeight`: clamp 0.5–3.0
  - `zOrder`: must be 'above'/'behind', default 'above'
  - `entries`: cap at 5
- [x] If `textOverlay` field is absent (older exports): default to disabled
- [x] Update `setTextOverlayConfig()` with imported values

### Phase 8: Video Export

Draw text overlays onto the canvas during video encoding.

#### 8.1 Update `useVideoExport.ts`

- [x] Accept `textOverlayConfig` in `ExportOptions`
- [x] Before the frame loop, ensure Inter font is loaded (it should already be via CSS, but verify with `document.fonts.ready`)
- [x] In the frame rendering function:
  - **Before drawing SVG pattern** (for "behind" z-order): draw behind-entries using `ctx.fillText()`
    - Set `ctx.font` with correct weight and computed pixel size
    - Set `ctx.fillStyle` to entry color
    - Set `ctx.textAlign` to entry alignment
    - Compute y position from percentage
    - Handle word wrap manually: measure with `ctx.measureText()`, break lines, draw each line
  - **After drawing SVG pattern** (for "above" z-order): draw above-entries using `ctx.fillText()`
  - **After text overlays**: draw logo (existing behavior, logo stays on top)

```ts
// Sketch of video text rendering
function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  entries: TextOverlayEntry[],
  position: 'behind' | 'above',
  canvasWidth: number,
  canvasHeight: number,
) {
  const filtered = entries.filter(e => e.zOrder === position);
  for (const entry of filtered) {
    const fontSize = (entry.fontSize / 100) * canvasHeight;
    ctx.font = `${entry.fontWeight} ${fontSize}px Inter`;
    ctx.fillStyle = entry.color;
    ctx.textAlign = entry.alignment;
    ctx.textBaseline = 'top';

    const x = entry.alignment === 'left' ? 0
            : entry.alignment === 'right' ? canvasWidth
            : canvasWidth / 2;
    const y = (entry.y / 100) * canvasHeight;
    const lineHeight = fontSize * entry.lineHeight;

    // Word wrap using ctx.measureText()
    const lines = wrapTextCanvas(ctx, entry.content, canvasWidth);
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * lineHeight);
    });
  }
}
```

### Phase 9: Bundle Script & README

Update the distribution pipeline and documentation.

#### 9.1 Update bundle script (`scripts/bundle.mjs`)

- [x] Add `textOverlay.ts` to the `files` object (reads from `implDir`)
- [x] Add `processFile(files.textOverlay)` to the `sections` array, positioned before `generateFragmentSvg` (since the SVG generator will import from it)
- [x] Run `npm run bundle` and verify the output includes the text overlay code
- [x] Verify no opentype.js references leak into the bundle

#### 9.2 Update README

- [x] Document the text overlay feature in the implementation guide
- [x] Show how text overlay data appears in the config JSON
- [x] Explain that `generateSvgFromExport()` automatically renders text overlays from pre-computed paths
- [x] Document the raw text config fields for implementers who want to render text themselves (e.g. using their own font/styling)
- [x] Add a code example for the "text overlay with animation" use case

### Phase 10: Testing & Verification

#### 10.1 Manual testing in the app (using Playwright MCP or browser)

- [x] Create a text overlay with 2 entries (heading + body), verify preview rendering
- [x] Test all controls: y position, font size, weight, alignment, color, line height, z-order
- [x] Test word wrap: enter long text, verify it wraps at canvas edges
- [x] Test z-order "behind" with animation: verify text is hidden by pattern and revealed as pattern animates away
- [x] Test z-order "above": verify text renders on top of pattern
- [x] Test with logo enabled: verify logo is above text overlays
- [x] Test add/remove entries (up to 5 max)
- [x] Test URL persistence: configure text overlay, refresh page, verify state is restored

#### 10.2 Export testing

- [x] Export SVG: open in browser/Figma, verify text appears as vector paths at correct position/size/color
- [x] Export config JSON: verify structure matches spec, paths are present, raw config is present
- [x] Import config JSON: verify text overlay state is restored correctly
- [x] Export video: verify text appears in video at correct position, with correct z-order layering
- [x] Export SVG with "behind" z-order: verify text paths appear before pattern cells in SVG DOM

#### 10.3 Bundle verification

- [x] Run `npm run bundle`, verify `textOverlay.ts` content is included
- [x] Verify no opentype.js or font-loading code leaked into the bundle
- [x] Verify `generateSvgFromExport()` correctly renders text overlay paths from a sample config JSON

#### 10.4 Edge cases

- [x] Empty text content: should render nothing (no empty `<g>` or invisible elements)
- [x] Very long text: verify word wrap handles gracefully, no overflow
- [x] Special characters: test quotes, ampersands, angle brackets (must be escaped in SVG paths/attributes)
- [x] 5 entries at once: verify UI handles it, URL doesn't get unreasonably long
- [x] Text overlay enabled but no entries: should behave same as disabled
- [x] Transparent background + "behind" z-order: verify the reveal effect works

## Open Questions / Future Enhancements

- **Letter spacing:** Deferred. Can be added later as an optional per-entry field.
- **Drag-to-position in preview:** Would be a nice UX improvement. Deferred — start with y-position slider.
- **Padding/margin from canvas edges:** Currently text goes edge-to-edge. May want small default padding (e.g. 2–5% from edges) so text doesn't touch the boundary. Decide during implementation based on how it looks.
- **Responsive text at very small sizes:** If someone renders the pattern at a tiny size, text may be unreadable. This is the exporter's responsibility — they create the config for a particular target size. Not a problem we need to solve.
