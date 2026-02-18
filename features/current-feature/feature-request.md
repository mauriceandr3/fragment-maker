# Text-as-Grid-State: Animate Patterns Into/From Text

## Summary

Add text as an alternative "state type" alongside the existing noise-based patterns. The user can select either "pattern" or "text" for the from/to animation states, allowing the fragment pattern to animate into — or from — text. Text is rendered using built-in bitmap font definitions that produce the same pixelated aesthetic as the noise patterns (individual cells/rects).

## Current Behavior

When animation is enabled, the user configures two independent noise-based pattern configs (From and To). The system generates two boolean grids, diffs them, and creates an SVG where unique cells get `data-g="a"` / `data-g="b"` attributes for wave-based animation.

## Proposed Behavior

### New concept: State Type

Each animation slot (From / To) gets a "state type" selector: **Pattern** or **Text**. When set to "Pattern", behavior is unchanged. When set to "Text", a text configuration panel replaces the pattern parameters panel.

When animation is disabled, the single view also has a state type selector — allowing standalone text rendering.

### Text rendering via bitmap fonts

Text is rendered using built-in bitmap font definitions — boolean 2D arrays at three canonical sizes:

- **3×5** — minimum readable, ultra-compact
- **5×7** — standard pixel font
- **7×9** — high detail, smoother letterforms

Characters supported: A-Z (uppercase), 0-9, common punctuation (`. , ! ? - ' " : ; / ( ) & @ # + =`), space.

Text input is converted to uppercase before rendering.

### Font size and scaling

The user specifies a **character height in cells** (e.g., 15 cells). The system selects the font+scale combination that **maximizes actual rendered height** without exceeding the target. For each font, compute `scale = floor(targetHeight / fontHeight)` and `actualHeight = fontHeight * scale`. Pick the combo with the largest `actualHeight`. Tiebreak: prefer the higher-resolution font. See revised table in Clarifications section below.

Scaling is pure integer multiplication — each font pixel becomes a scale×scale block of cells. This preserves the pixel art aesthetic.

If the target height is less than 5 (the smallest font), text rendering is disabled with a validation message.

### Resolution and grid proportions

What matters is the **grid resolution** (cols × rows = canvasWidth/cellSize × canvasHeight/cellSize), not the raw pixel dimensions. Examples:

- 1000×1000 canvas, 10px cells = 100×100 grid → plenty of room for text
- 200×200 canvas, 40px cells = 5×5 grid → too small for any text
- 100×100 canvas, 2px cells = 50×50 grid → fine
- 5000×5000 canvas, 50px cells = 100×100 grid → fine

### Text layout

- **Multi-line**: Supports explicit line breaks (`\n`) and optional word wrapping
- **Horizontal alignment**: Left / Center / Right
- **Vertical alignment**: Top / Center / Bottom
- **Word wrap**: Optional — wraps at word boundaries within grid width
- **Invert**: Text is "holes" in a filled background (all cells on, text cells off)
- **Character spacing**: `1 * scale` cells gap between adjacent characters (scales with font)
- **Line spacing**: `2 * scale` cells gap between adjacent lines (scales with font)

### Validation feedback

The text config panel shows real-time validation:
- "Text truncated: X of Y lines visible" — when text overflows vertically
- "Grid too small for this character size" — when minimum font (3×5) doesn't fit
- "Unsupported characters: ..." — for characters without glyph definitions

### Animation integration

Text produces the same `boolean[][]` grid as pattern generation. The existing animation system (diff SVG with `data-g` attributes, wave-based BFS reveal) works unchanged:

| From    | To      | Result |
|---------|---------|--------|
| Pattern | Pattern | Current behavior (no change) |
| Pattern | Text    | Pattern dissolves into text on hover |
| Text    | Pattern | Text dissolves into pattern on hover |
| Text    | Text    | Text A morphs into Text B on hover |

### UI layout

When animation is enabled:
```
[Canvas Settings] [Animation Settings] [Colors]

[State Type: Pattern ○ | ● Text]    [State Type: ● Pattern | ○ Text]
[TextConfigPanel: From]              [ParametersPanel: To]
```

When animation is disabled:
```
[Canvas Settings] [Animation Settings] [Colors]

[State Type: Pattern ○ | ● Text]
[TextConfigPanel or ParametersPanel]
```

### Text config panel controls

- **Text input** — textarea for multi-line text
- **Character height** — slider (5–100 cells)
- **Alignment** — button group: Left / Center / Right
- **Vertical alignment** — button group: Top / Center / Bottom
- **Word wrap** — checkbox
- **Invert** — checkbox (text as negative space)

### Grid view

Grid view (20 frequency variations) is disabled when any state type is "text". Shows a message: "Grid view not available for text states."

## Export format

Version bumps to `2.2.0`. New optional fields:

```json
{
  "version": "2.2.0",
  "config": { /* from-pattern settings */ },
  "fromStateType": "text",
  "fromTextConfig": {
    "text": "HELLO",
    "charHeight": 15,
    "alignment": "center",
    "verticalAlignment": "center",
    "wordWrap": true,
    "invert": false
  },
  "toConfig": { /* to-pattern settings */ },
  "toStateType": "pattern",
  "animation": { "duration": 600 }
}
```

- `fromStateType` / `toStateType` only present when value is `"text"` (defaults to `"pattern"` when absent for backward compatibility)
- `fromTextConfig` / `toTextConfig` only present when respective state type is `"text"`
- Fully backward compatible with v2.1.0 imports

## URL persistence

New URL params (only included when state type is `"text"`):
- `fst` / `tst` — state type
- `ftxt` / `ttxt` — text content (URI-encoded)
- `fch` / `tch` — character height
- `fal` / `tal` — alignment
- `fva` / `tva` — vertical alignment
- `fww` / `tww` — word wrap (0/1)
- `fin` / `tin` — invert (0/1)

## What stays the same

- The hover animation mechanism in `useFragmentReveal` — no changes needed
- Canvas settings are shared between from and to
- Color settings remain shared
- Pattern configuration when state type is "pattern"
- All existing exports and URL formats remain valid

## Implementation files convention

Core logic (bitmap fonts, text grid generation) goes in `src/implementation-files/` as these are files users may copy into their own projects. UI components go in `src/app/components/fragment/`.

New implementation files:
- `src/implementation-files/bitmapFonts.ts` — font definitions and selection logic
- `src/implementation-files/generateTextGrid.ts` — text-to-grid renderer

## Key design decisions

1. **Built-in bitmap fonts** (not canvas rasterization) — full control over pixel art aesthetic, deterministic, no font loading
2. **Text as a new state type** (not overlay/mask) — clean separation, animation system unchanged
3. **Integer scaling only** — preserves pixel art look at all sizes
4. **Uppercase only** — reduces font definition surface area, matches the bold geometric aesthetic
5. **Monospace fonts** — all characters within a font size have the same width (matching their canonical width: 3, 5, or 7 columns). Simplifies layout math and matches the pixel-grid aesthetic.

## Clarifications (post-review)

### Font selection algorithm (revised)

The algorithm should **maximize actual rendered height** (closest to target without exceeding it), not blindly prefer the largest canonical font. For each font, compute `scale = floor(targetHeight / fontHeight)` and `actualHeight = fontHeight * scale`. Pick the font+scale combo with the largest `actualHeight`. Tiebreak: prefer the higher-resolution font.

| Target height | 7x9 (scale, actual) | 5x7 (scale, actual) | 3x5 (scale, actual) | Winner |
|---------------|----------------------|----------------------|----------------------|--------|
| 5             | 0, 0                | 0, 0                | 1, 5                | 3x5@1x |
| 7             | 0, 0                | 1, 7                | 1, 5                | 5x7@1x |
| 9             | 1, 9                | 1, 7                | 1, 5                | 7x9@1x |
| 10            | 1, 9                | 1, 7                | 2, 10               | 3x5@2x |
| 14            | 1, 9                | 2, 14               | 2, 10               | 5x7@2x |
| 18            | 2, 18               | 2, 14               | 3, 15               | 7x9@2x |
| 27            | 3, 27               | 3, 21               | 5, 25               | 7x9@3x |

### Spacing scales with font

Character and line spacing must scale with the font scale factor to maintain consistent visual proportions:
- **Character spacing**: `1 * scale` cells between adjacent characters
- **Line spacing**: `2 * scale` cells between adjacent lines

### Empty text and edge cases

- **Empty text** (`""`) or **all-space text**: produces an all-false grid. With invert enabled, this becomes an all-true grid (solid fill).
- **Single character**: alignment works normally — the character is positioned according to horizontal and vertical alignment settings.
- **Text wider than grid (word wrap off)**: truncated at character boundaries — partial characters at the right edge are never rendered.

### Newlines in text

The textarea produces real newline characters (pressing Enter). These are:
- Encoded as `%0A` in URL params (`ftxt`/`ttxt`)
- Stored as standard `\n` escape sequences in JSON export

### Max text length

Text input is capped at **500 characters** to keep URLs manageable.

### Animation toggle behavior with text states

When animation is disabled, the **from** state becomes the single displayed state (consistent with existing behavior where `params` is the active config). The "to" config is preserved but hidden. When animation is re-enabled, both states return with their previous configurations intact.

### Debouncing

Text input uses the same 100ms debounce mechanism already in `useFragmentState` for SVG regeneration. No additional debounce needed.
