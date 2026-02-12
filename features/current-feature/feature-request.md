# Animation Preview: Independent From/To Patterns

## Summary

Replace the current seed-based animation preview (which only varies the `frequency` parameter between two states) with a system where the user has full independent control over both the "from" and "to" patterns. This produces much more striking transitions since the two patterns can be completely different.

## Current Behavior

When "Preview animation on hover" is checked, the user provides two seed strings (A and B). Each seed is hashed and used to vary a single parameter (frequency by default). The result is a subtle shift in the same pattern. The diff SVG encodes cells unique to each pattern with `data-g="a"` / `data-g="b"` attributes, and the hover animation fades between them.

## Proposed Behavior

### UI

When "Preview animation on hover" is checked:

1. The existing settings panel gets the title **"From"**.
2. A second settings panel appears beside it, titled **"To"** (see `img1.png` for layout).
3. The "To" panel contains all the same controls as the "From" panel: all generator params (threshold, gamma, frequency, contrast, seed, fill settings, directional neighbors/density) and color settings (presets, foreground, background, invert). **Canvas settings (width, height, cell size, cropping) remain shared** — they are not duplicated in the "To" panel.
4. **Remove** the current Seed A / Seed B text inputs and the "Randomize Seeds" button entirely. They are replaced by this new system.

### Initialization

When the user first checks "Preview animation on hover" and the "To" panel appears:

- All "To" settings are initialized as a **copy of the current "From" settings**, except for the **frequency** param, which is initialized with a **random value** within its valid range. This gives an immediate visual difference while keeping the overall structure recognizable.

### Preview behavior

- The SVG preview transitions between the "From" pattern and the "To" pattern on hover, same as today.
- The transition animation mechanism (fade out "from" rects, fade in "to" rects using `data-g` attributes) remains the same.

### Export format

When animation is enabled, the exported JSON should include a `toConfig` field alongside the existing `config`:

```json
{
  "version": "2.0.0",
  "config": { /* from-pattern settings (unchanged field name) */ },
  "toConfig": { /* to-pattern settings, full config object */ }
}
```

- `config` keeps its current name — it is the primary pattern config and is not renamed to "fromConfig". This avoids breaking changes and is accurate for contexts where animation is not used.
- `toConfig` is a **full config object** containing all generator params and color settings (same shape as `config`). It is only present when animation is enabled.
- The current `animationSeedA` / `animationSeedB` / `animationEnabled` fields in the export are replaced by the presence/absence of `toConfig` (if `toConfig` exists, animation is enabled).

### SVG generation

The `generateFragmentDiffSvg` function (or its replacement) should:

1. Accept two full configs (the "from" config and the "to" config).
2. Generate two independent grids — one per config.
3. Combine them into a single SVG using the existing `data-g` attribute scheme:
   - Cells in both grids: no `data-g` (always visible)
   - Cells only in "from": `data-g="a"` (visible initially)
   - Cells only in "to": `data-g="b"` (hidden initially, `opacity: 0`)

This is the same approach as today, but the two grids are now generated from fully independent configs rather than from the same config with a single varied parameter.

### What stays the same

- The hover animation mechanism in `useFragmentReveal` (frame-based opacity toggling of `data-g="a"` and `data-g="b"` rects) — no changes needed.
- Canvas settings are shared between "from" and "to" (both patterns use the same grid dimensions).
- Single/Grid view toggle behavior.
- The `config` field name in exports.

---

## Clarifications

- **Colors are shared, not per-panel.** Despite the mockup in `img1.png` showing independent color sections for From/To, colors (presets, foreground, background, invert) remain a single shared section — not duplicated per panel. Color-based transitions are out of scope for this feature.
- **`scale` (zoom) is a UI-only display setting** and is not part of the generator config or export format. It does not appear in From/To panels.
