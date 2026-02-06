# PRD Critique: Canvas Dimensions & Aspect Ratio Controls

**Reviewer:** Senior Developer (15 years of dealing with exactly this kind of mess)
**Verdict:** 🔥 Not Ready for Implementation

---

## Critical Issues

### 1. The Snapping + Aspect Ratio Paradox (PRD-006 + PRD-015)

This PRD has a fundamental logical contradiction that will cause infinite loops or impossible states.

**The problem:**
- PRD-006 says: Snap width to nearest cell-aligned value
- PRD-004 says: Height = Width × (ratioHeight / ratioWidth)
- PRD-006 also says: "height also snaps to cell-aligned values"
- PRD-015 says: "aspect ratio is maintained after snapping"

These requirements are **mutually exclusive**. Pick any two:
1. Exact aspect ratio
2. Cell-aligned width
3. Cell-aligned height

**Example:** Width = 1008px (divisible by 48), AR = 16:9
→ Height = 1008 × 9/16 = **567px**
→ 567 ÷ 48 = 11.8125 cells — NOT ALIGNED!
→ Snap height to 576px
→ New AR = 1008:576 = **1.75:1** — NOT 16:9!

What's the actual behavior? This PRD doesn't say. This is the CORE of the feature and it's unspecified.

---

### 2. PRD-010: The Default State Is Already Invalid

Default is 1000×1000px. The PRD acknowledges dimensions must be divisible by cell size.

Common cell sizes: 24, 32, 48, 64px

1000 ÷ 48 = 20.83 — **Invalid on load.**

So the very first thing that happens when a user opens the app is a snapping warning? What a delightful UX.

The PRD weakly says "(or snapped value based on cell size)" in the verification steps. So what IS the default? 1000? Or whatever it snaps to? Document it.

---

### 3. Input Validation: Nonexistent

What happens when the user enters:
- `0` for width?
- `-500`?
- `999999999`?
- `abc`?
- `12.5`?
- Nothing (empty field)?

What are the min/max bounds? 1px minimum? 50,000px maximum? The browser will explode rendering a 50000×50000 canvas.

For custom ratio inputs:
- `0:0`? Division by zero incoming.
- `1:0`? Infinite height.
- `-1:5`? Negative ratios?
- `1000000:1`? That's a 1px tall stripe.

**Zero validation rules specified.**

---

### 4. Order of Operations: Undefined

User has 1600×900 (16:9). They change cell size from 48px to 64px.

Now 1600 ÷ 64 = 25 ✓ (valid)
But 900 ÷ 64 = 14.0625 ✗ (invalid)

What happens?
- Option A: Snap height to 896px → AR becomes 1600:896 = **1.79:1** (not 16:9)
- Option B: Keep AR, recalculate width → 896 × 16/9 = 1593.8 → snap to 1600 → height still wrong
- Option C: Keep AR, snap width first → ??? circular dependency
- Option D: Unlock AR temporarily? Silently?

**The PRD doesn't specify priority.** This WILL cause bugs.

---

### 5. Debouncing: Unspecified

User types "1920" in the width field.

- After "1": Snap to nearest? Show warning for 0px?
- After "19": Snap to 0? 24? 16?
- After "192": Snap to 192?
- After "1920": Finally the intended value?

When exactly do we:
1. Calculate height?
2. Trigger snapping?
3. Show/hide warning?

On every keystroke? On blur? On Enter? After 300ms debounce? This dramatically affects UX and will absolutely cause implementation disagreements.

---

### 6. PRD-007: Warning Behavior is Vague

"Dismissible and non-blocking" — okay but:
- Does a new snap dismiss the old warning automatically?
- Can multiple warnings stack?
- Does the warning have a timeout?
- Where does it appear? Toast? Inline? Modal?
- Does it persist across aspect ratio changes?
- If I dismiss it, then change a value, does it reappear?

"Dismissible" is not a specification.

---

### 7. PRD-011: Grid View Hand-Waving

"Items may have varying sizes to accommodate different proportions."

This is not a spec. This is a wish.

- What's the sizing algorithm?
- What's the minimum item size?
- What's the maximum?
- How many columns? Fixed? Dynamic?
- What happens with extreme ratios like 21:9 or 1:3?
- Do items have equal area? Equal width? Equal height? None of the above?

"Just make it work" is not an acceptance criterion.

---

### 8. PRD-013: Contradictory Display Logic

The PRD says to display:
- "1:1" for square preset
- "Custom" when using custom inputs

But also:
- "Calculate and simplify when dimensions result in a known ratio"

So if I enter custom 8:4, do we:
- Show "Custom" (because I used custom inputs)?
- Show "2:1" (simplified)?
- Show "8:4" (what I entered)?

If I enter 16:9 in custom mode, does it switch to show the 16:9 preset as selected? That would be insane. But showing "Custom" when it's actually 16:9 is also confusing.

---

### 9. Migration Path: Missing

- What happens to existing bookmarked URLs with `?size=2K`?
- What about saved presets or localStorage state?
- Do we break every existing deep link?

Zero consideration for backwards compatibility.

---

### 10. Accessibility: Ignored

- Keyboard navigation between ratio buttons?
- Screen reader announcements for calculated values?
- ARIA labels for the "locked" state?
- Focus management after snapping?

Nothing. Zero. Zilch.

---

### 11. Cell "Scale" vs Cell "Size" Confusion

PRD-009 says to keep "Cell Scale" dropdown.
PRD-006, PRD-007, PRD-015 all reference "cell size" for snapping.

Are these the same thing? Different things? The feature request mentions both:
- "Cell Scale dropdown in the Parameters section"
- "current cell size (e.g., 48px)"

If Cell Scale is a multiplier and cell size is derived, what's the base? If I change scale, does size change? Does that trigger re-snapping? This needs a diagram.

---

### 12. Performance: Unaddressed

Every dimension change triggers:
1. Aspect ratio calculation
2. Snapping algorithm (twice, for width and height)
3. Grid recalculation (potentially dozens of SVGs)
4. Warning state update
5. Possibly URL/state persistence

What's the expected latency? Is there a loading state? Can the user spam inputs faster than we can process?

---

## Minor Issues

1. **PRD-002** doesn't specify custom ratio input constraints (integers only? decimals? max value?)
2. **PRD-003** says height "shows calculated value" — what if AR is unlocked? (hint: there's no unlock mechanism in this PRD)
3. **PRD-014** step says "Switch to Custom and enter 2:1" but there's no spec for the UX of the two-field custom ratio input interaction
4. Height being read-only means no copy/paste of full dimension specs from design tools
5. No mention of what happens if browser window is smaller than the specified canvas dimensions
6. "9:16" button label is portrait but could easily be confused with 16:9 in a horizontal button row

---

## Summary

This PRD has one job: specify how aspect ratios and dimensions interact with cell-aligned grids. It fails at that one job.

The core snapping behavior is **logically impossible as written**. You cannot have exact aspect ratios AND cell-aligned width AND cell-aligned height. Something has to give, and this PRD doesn't say what.

Everything else — validation, defaults, debouncing, warnings, grid sizing — are just additional ways this feature will break in production.

**Do not implement until the snapping paradox is resolved and edge cases are specified.**

---

*"The first 90% of the code accounts for the first 90% of the development time. The remaining 10% of the code accounts for the other 90% of the development time."* — This PRD is currently that remaining 10%, specified at 0%.
