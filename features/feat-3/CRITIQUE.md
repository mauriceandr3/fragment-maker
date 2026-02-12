# PRD Critique: Simplify Dimension & Cell Size Controls (Round 2)

**Reviewer:** Senior Dev (still hostile, but acknowledging improvements)
**Verdict:** The PRD addressed several issues from the first review (tie-breaking, cropping labels, export format, coprime hint). But new problems have surfaced, and the cropping feature is *still* underspecified in ways that will block implementation.

---

## 1. PRD-011a Creates a Logical Contradiction

When dimensions are coprime (e.g., 100x101, GCD=1), there are zero valid divisors in the 4-200 range. The PRD says:

> "The previously selected cell size remains in use until the user changes dimensions or enables cropping."

Think about what this means. The user had cell size 50, changes dimensions to 100x101, and... cell size stays at 50. **But cropping is OFF.** 50 doesn't divide 100 or 101 evenly. So either:

- The grid silently renders with floor division (incomplete coverage, gap at edges) — which is *cropping without the user enabling cropping*
- The grid breaks or renders nothing
- Some hidden adjustment kicks in, which we just ripped out per PRD-018/019

You can't have "no valid sizes, keep the old one, no cropping, no adjustment" simultaneously. Something has to give, and the PRD doesn't say what. This isn't an edge case — any off-by-one dimension change can trigger it.

**Fix:** Either force "Allow cropping" on when no valid sizes exist, or auto-select the nearest dimension pair that has valid divisors and show a notification.

## 2. The Feature Request Has a Math Error

The feature request example states:

> For dimensions 200 x 350, GCD = 50, divisors ≥ 4 = **4, 5, 10, 25, 50**

4 is NOT a divisor of 50. The divisors of 50 are {1, 2, 5, 10, 25, 50}. Those ≥ 4 are {5, 10, 25, 50}.

PRD-007 gets this right in the verification steps, but the feature request itself — the source of truth — has a wrong example. If anyone implements from the feature request instead of the PRD, they'll include 4 incorrectly.

**Fix:** Correct the example in the feature request.

## 3. Hint Threshold Mismatch Between Feature Request and PRD

The feature request says:

> When there are **3 or fewer** valid cell sizes, show a subtle hint.

But PRD-011a triggers the hint only when there are **zero** valid sizes:

> "When no valid GCD divisors exist in the 4-200 range"

These are different conditions. A user with dimensions yielding exactly 1 or 2 valid cell sizes (like 512x256, GCD=256, valid divisors: {4, 8, 16, 32, 64, 128}) — wait, that's 6. OK, a tighter example: 128x96, GCD=32, valid divisors: {4, 8, 16, 32} — that's 4, so it wouldn't trigger the ≤3 hint either. Finding dimensions that give exactly 1-3 valid sizes is actually tricky, which suggests the "≤3" threshold from the feature request may have been arbitrary. But the discrepancy still needs resolving.

**Fix:** Decide: is the hint for zero valid sizes (PRD) or ≤3 valid sizes (feature request)?

## 4. Crop Direction Default Is Unspecified (PRD-015)

When the user enables "Allow cropping," a direction toggle appears with "Crop width" and "Crop height." Which one is selected by default? The PRD doesn't say.

This matters because:
- The grid renders completely differently depending on the selection
- If the default is "Crop width," the user sees partial cells on the right immediately
- If there's no default and neither is selected, the grid can't render at all

**Fix:** Specify the default crop direction. "Crop height" is probably the more intuitive default since most people read left-to-right and expect full columns.

## 5. What Does "Empty Space" Look Like? (PRD-016, PRD-017)

PRD-016 says for "Crop width" mode:

> rows = floor(500/37) = 13 full rows, **bottom 19px is empty** (no partial rows)

What does "empty" mean visually?
- Background color fill?
- Canvas background showing through?
- Transparent?
- A visible boundary indicator?

On a 500x500 canvas with 13 rows of 37px cells, the grid covers 481px of height. The remaining 19px at the bottom is... what? If it's just background color, the user might think the canvas is 500x481. If there's no visual distinction, they won't know cropping is happening on the other axis.

**Fix:** Specify the visual treatment of empty space. At minimum: "Empty space shows the canvas background color with no additional indicator."

## 6. Slider Tick Marks Are Still a Custom Component Problem (PRD-014)

The first critique flagged this. The PRD still specifies:

> The slider visually marks positions that correspond to GCD divisors with tick marks or indicators.

The codebase uses Radix UI. Radix Slider has no tick mark API. This is not a "display some buttons" task — it's a custom component with:
- Absolute-positioned tick marks calculated from divisor positions
- Accessibility concerns (screen readers need to announce tick positions)
- Visual design that doesn't clash with the existing Radix styling

This needs to be called out as a distinct engineering task, not a sub-bullet of the slider story.

**Fix:** Either scope this as its own PRD item with design specs, or simplify to "display valid divisors as small text labels below the slider" (much simpler to implement).

## 7. Export Schema Gaps (PRD-020)

PRD-020 specifies adding `allowCropping` and `cropDirection` to the export. But:

1. **What's `cropDirection` when `allowCropping` is false?** `null`? `undefined`? Omitted? A default value? This matters for JSON schema validation.
2. **There is no import functionality.** The PRD says "Old v1 exports with aspect ratio fields are silently ignored if loaded" — but the codebase exploration confirmed there's no load/import feature. Are we building import now too? Or is this aspirational for a future feature?
3. **What about `cellSize` range change?** Old exports may have cell sizes between 8-128 (old range). New valid range for the slider is 4-200. If a loaded config has `cellSize: 128` and the new valid set doesn't include 128, what happens?

**Fix:** Define the full export JSON schema with types and nullability. Clarify whether import exists or is future scope.

## 8. Scale Parameter Is Still Ignored

The codebase has a `scale` parameter affecting canvas rendering:

```
Canvas: cols × (cellSize × scale), rows × (cellSize × scale)
SVG export: cols × cellSize, rows × cellSize
```

When cropping mode renders partial cells at edges, the partial cell width/height must be calculated in both logical (SVG) and scaled (canvas preview) coordinates. The PRD never mentions `scale`. If the implementer forgets to apply scale to the cropped edge cells, the preview and export will look different.

**Fix:** Add a note about scale-aware rendering for cropped cells, or confirm that scale is applied uniformly and needs no special handling.

## 9. PRD-018 Verification Step Doesn't Test the Dangerous Case

PRD-018 tests changing width from 500 to 400, which gives GCD(400,500)=100 — a very friendly GCD with lots of divisors. This doesn't test the problematic scenario at all.

The dangerous case is: change width from 500 to **501**. Now GCD(501,500)=1, zero valid divisors ≥4. This is where the system's behavior is unspecified (see Issue #1 above) and where real users will end up.

**Fix:** Add a verification step for coprime-result dimension changes. Specify what should happen.

## 10. Toggling Cropping Off — What Happens to Cell Size? (PRD-013)

User flow:
1. Set 500x500, cell size 50 (valid divisor)
2. Enable "Allow cropping"
3. Slide to cell size 37
4. Disable "Allow cropping"

Now we're back in normal mode. 37 is not a divisor of GCD(500,500)=500. PRD-011 says auto-select nearest valid size. That's fine.

But what if the user was at:
1. Set 100x101, zero valid sizes, cell size stuck at 50 from before
2. Enable "Allow cropping," slide to 37
3. Disable "Allow cropping"

Now we're back in normal mode with zero valid sizes. Cell size was 37 (from slider), which is not valid. PRD-011a says "previously selected cell size remains in use" — but which "previously selected"? The 37 from the slider? The 50 from before cropping was enabled? The PRD doesn't track a "pre-cropping cell size."

**Fix:** Specify whether enabling/disabling cropping preserves a "pre-cropping" cell size or always applies the nearest-valid logic to the current value.

## 11. Cropping Mode When Cell Size Evenly Divides Both Dimensions

500x500, cropping enabled, cell size 50. 50 divides both perfectly. There are zero partial cells. The crop direction toggle is visible but... irrelevant? Both "Crop width" and "Crop height" produce identical grids.

Is this confusing? Should the toggle be hidden/disabled when the current cell size evenly divides both dimensions? Should the "Evenly divisible" indicator be sufficient?

Not critical, but a polish question that will come up during implementation and cause a design debate.

## 12. Performance at Cell Size 4

The new minimum is 4px (down from 8px). On max canvas 4096x4096:
- Cell size 4: **1,048,576 cells** (each a `<rect>` SVG element)
- Grid view: 20 variations × 1M = **20 million SVG elements**

The old minimum of 8px gave 262,144 cells — already sluggish. Halving the minimum cell size quadruples the cell count. The PRD has no performance guard, no lazy rendering, no cell count warning.

**Fix:** Add a performance warning threshold (e.g., >100k cells) or keep the minimum at 8px. At minimum, skip grid view generation above a certain cell count.

---

## Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | PRD-011a: no-valid-sizes + no-cropping = contradiction | **Critical** |
| 2 | Feature request math error (4 is not a divisor of 50) | Low |
| 3 | Hint threshold mismatch (0 vs ≤3) | Low |
| 4 | Crop direction default unspecified | Medium |
| 5 | Empty space visual treatment undefined | Medium |
| 6 | Slider tick marks = custom component (still) | Medium |
| 7 | Export schema incomplete | Medium |
| 8 | Scale parameter interaction ignored | Medium |
| 9 | PRD-018 doesn't test the dangerous case | Medium |
| 10 | Cropping toggle state persistence unclear | **High** |
| 11 | Cropping mode when cell size divides perfectly | Low |
| 12 | Performance at 4px cell size | **High** |

**Bottom line:** The PRD is significantly better after Round 1 fixes. The cropping labels, tie-breaking, and export format are all handled now. But Issue #1 (the no-valid-sizes contradiction) is a **logical impossibility** in the current spec — it literally can't be implemented as written. Fix that, clarify the cropping toggle state (#10), and add a performance guard (#12) before starting implementation.
