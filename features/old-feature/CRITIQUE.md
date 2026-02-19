# PRD Critique: Text-as-Grid-State

**Reviewer**: Senior Dev (hostile)
**Verdict**: This PRD has the ambition of a cathedral and the structural integrity of a sandcastle. Let me count the ways.

---

## 1. The Font Selection Algorithm Is Objectively Wrong

The algorithm says: "iterate from largest to smallest; first font where `max_scale >= 1` is selected."

Target height 14:
- 7x9 at 1x = **9 cells** (5 cells wasted, 36% of target unused)
- 5x7 at 2x = **14 cells** (perfect fit)

The algorithm picks 7x9 at 1x. It **prioritizes resolution over fill**, which means you'll routinely get huge gaps between the rendered text and the available space. A user sets charHeight=14 and gets text that's 9 cells tall. That's not a rounding error — that's a lie.

The correct algorithm should maximize `fontHeight * scale` (i.e., pick the font+scale combo that gets closest to `targetHeight` without exceeding it), not blindly prefer the largest canonical font.

## 2. 162 Hand-Coded Boolean Glyph Arrays

3 font sizes x 54 characters = **162 glyph definitions**. Each is a hand-coded 2D boolean array. The PRD treats this like a bullet point, not the Herculean task it actually is.

- Who designs these glyphs? Who validates that 'Q' at 3x5 is actually readable?
- What's the reference? Are we inventing pixel fonts from scratch or copying from established ones (licensing implications)?
- A single off-by-one in any glyph array (wrong row count, wrong column count) will cause silent rendering corruption. There's no validation step proposed.
- The PRD doesn't even specify whether fonts are monospace or proportional. The "3x5" notation implies fixed-width, but then 'I' and 'W' at 7x9 are the same width? That'll look terrible. And if they're proportional, the entire spacing/alignment/wrapping math changes.

## 3. Spacing Doesn't Scale

> "1 cell gap between characters, 2 cell gap between lines"

At 1x scale, a 7-wide character gets a 1-cell gap. Fine — 14% spacing ratio.

At 5x scale, a 35-wide character gets a 1-cell gap. That's **2.8% spacing**. Characters will look jammed together like rush-hour subway passengers. This is a visual disaster at higher scales. Spacing MUST scale with the font scale factor, or at minimum be configurable.

## 4. URL Length Bomb

14 new URL parameters (7 per state x 2 states). The text content (`ftxt`/`ttxt`) is URI-encoded. A modest 3-line text block like:

```
INTERNET COMPUTER
DECENTRALIZED CLOUD
POWERED BY ICP
```

URI-encoded: ~70 characters. Now add all the other params for both states, plus the existing params. We're flirting with URL length limits (2048 chars in IE/Edge legacy, many server configs). The PRD doesn't mention:

- Maximum text length
- What happens when URLs exceed browser/server limits
- Whether to use URL compression or hash-based storage for long configs

## 5. Empty/Edge State Black Holes

The PRD never specifies:

- **Empty text**: What does `text=""` render? An empty grid? All-false? Does invert on empty text mean an all-true grid (solid block)?
- **All-space text**: Same question.
- **Single character**: Does alignment work sensibly?
- **Text that's wider than the grid but word wrap is off**: "Truncated" how? At the character level? Mid-glyph? What does a half-rendered 'W' look like?
- **Animation toggle while in text mode**: From=Text, To=Pattern. User disables animation. Which state wins? What happens to the other state's config? The PRD is silent.

## 6. Grid View Kill Is Lazy

> "Grid view is disabled when any state type is 'text'. Shows a message."

So if my From state is a *pattern* and my To state is *text*, I lose grid view for the pattern too? That's collateral damage. The 20-variation grid is one of the most useful features for exploring parameter space. Killing it entirely because one side is text is punitive.

Why not:
- Show grid variations for the pattern side only?
- Show text variations with different charHeights?
- At minimum, only disable when the *displayed* state is text?

The PRD chose the laziest option and moved on.

## 7. Performance Is Not a Footnote — It's Not Even a Footnote

No mention whatsoever of:

- Cost of text grid generation (glyph lookup + scaling + layout + alignment per character)
- Debouncing strategy for the text textarea (every keystroke triggers a grid regen?)
- Grid sizes: a 200x200 grid = 40,000 cells. Laying out scaled text across that with word wrapping and alignment isn't free
- Memory: the `boolean[][]` for large grids is already non-trivial. Now we're generating it from a completely different path with no shared caching story
- Animation diff size: inverted text → pattern means nearly every cell changes state. That's potentially 40,000 animated rects. Has anyone checked if the wave BFS animation handles that gracefully?

## 8. The "Invert" + Animation Interaction

Inverted text = all cells ON, text cells OFF. Transition to a noise pattern where ~50% of cells are ON.

The diff between these two grids could be enormous — 50%+ of all cells need to animate. The wave BFS was designed for organic noise transitions where the diff is usually a moderate subset. Has anyone tested what a 30,000-cell wave animation looks like? I suspect: laggy and visually chaotic.

## 9. Textarea ≠ `\n` Clarity

> "Supports explicit line breaks (`\n`)"

Is this literal `\n` (two characters: backslash, n) or an actual newline character? In a `<textarea>`, pressing Enter produces a real newline. But the PRD notation is ambiguous, and the URL encoding section doesn't clarify how newlines are represented in `ftxt`/`ttxt`.

Also: how does multi-line text in JSON export work? JSON strings can contain `\n` escape sequences, but the PRD's example shows `"text": "HELLO"` — a single line. No multi-line example is provided.

## 10. Backward Compatibility Is a House of Cards

> "fromStateType / toStateType only present when value is 'text' (defaults to 'pattern' when absent)"

So a v2.2.0 export where both states are patterns is byte-identical to v2.1.0 except for the version string. The importer has to sniff the version to know which schema to expect, but there's no actual schema difference.

More concerning: what happens when a v2.1.0 consumer (which doesn't know about text states) receives a v2.2.0 export with text states? It'll silently ignore `fromTextConfig` and `fromStateType` and render with default pattern params. The PRD claims "backward compatible" but this is **data loss masquerading as compatibility**. At minimum, a v2.1.0 consumer should warn that it's receiving a newer format it doesn't fully understand.

## 11. No Accessibility Story

Text rendered as SVG rects is invisible to screen readers. The PRD proposes rendering text — literally the most accessible content type on the web — in the least accessible way possible. No `aria-label`, no `<title>`, no `<desc>`, no alt text. Nothing.

## 12. The Character Height Slider Range Is Absurd

Range: 5-100 cells.

At charHeight=100 with 7x9 at scale 11: each character is **77 cells wide**. On a typical 100-column grid, you can display exactly ONE character. On a 33-column grid (1000px / 30px cells), you can display zero characters. The upper bound of 100 is meaninglessly large for most real configurations.

Meanwhile, the lower bound of 5 only works with the 3x5 font at 1x — the smallest, least readable option. There's no guidance on what charHeight values are actually useful for a given grid size.

## 13. What the PRD Got Right

Credit where due:
- Text as boolean[][] is the right abstraction — it plugs into the existing grid pipeline cleanly
- The animation system truly doesn't need changes
- Keeping text rendering in `implementation-files/` is correct per project conventions
- The state type concept is clean and extensible

The *architecture* is sound. The *specification* is riddled with gaps.

---

## Summary

The PRD reads like someone designed the happy path and called it a day. The font selection algorithm has a mathematical flaw. The spacing model breaks at scale. Edge cases (empty text, animation toggle, huge text, URL limits) are unaddressed. Performance is completely ignored. And the grid view restriction is unnecessarily heavy-handed.

Fix these before writing a single line of code, or you'll be rewriting half of it during code review.
