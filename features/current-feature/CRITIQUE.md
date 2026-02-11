# PRD Critique: Animation Preview — Independent From/To Patterns

**Reviewer**: Senior Dev (hostile)
**Verdict**: This PRD has structural contradictions, handwaves critical UX decisions, and silently deviates from the feature request in ways that will bite us later.

---

## Critical Issues

### 1. PRD-002 directly contradicts the feature request

The feature request explicitly states the "To" panel contains **"color settings (presets, foreground, background, invert)"**. PRD-002 unilaterally moves Colors to a shared section and says they are NOT duplicated per-panel. This is a significant scope reduction that was never discussed or justified.

If the intent is to allow "completely different" patterns, why can't the To pattern have different colors? A blue-on-white "From" transitioning to a red-on-black "To" would be far more striking. The PRD silently kills this use case and pretends the feature request asked for it.

**Decision needed**: Are colors shared or independent? Pick one and justify it. Don't just quietly contradict the spec.

### 2. PRD-007 destroys user work on toggle

The verification step says: *"Disable and re-enable animation — confirm 'To' params are re-initialized from current 'From' params."*

So if a user spends five minutes carefully tuning their "To" pattern, accidentally unchecks the box, and checks it again — everything is gone. Re-initialized. No confirmation, no undo. This is hostile UX.

**Fix**: Persist the "To" state across toggles. Only initialize from "From" on the *first* enable (or when there's no prior "To" state). An accidental toggle shouldn't nuke minutes of work.

### 3. PRD-014 is not a PRD item, it's a question

> "Consider adding a separate randomize control for the 'To' panel."

A PRD defines what we're building. "Consider" is not a decision. If the user has independent From/To panels, they obviously need a way to randomize each independently. Make the call. If we're not doing per-panel randomize, explain why. If we are, spec it.

### 4. Export format for `toConfig` is self-contradictory

PRD-011 says: *"'toConfig' contains all generator params and shared color/canvas settings (same shape as config)."*

But if colors and canvas are shared, why duplicate them in `toConfig`? This creates two problems:
- **Redundancy**: Color/canvas values appear in both `config` and `toConfig`. Which is authoritative?
- **Divergence risk**: What if someone hand-edits the JSON and `config.foregroundColor` differs from `toConfig.foregroundColor`? Who wins?

If `toConfig` only stores generator params (the things that actually differ), it's NOT the same shape as `config`, so stop claiming it is.

**Pick one**:
- `toConfig` has the same shape as `config` (full duplication, clear authority rules)
- `toConfig` only has generator params (different shape, but no ambiguity)

### 5. `scale` parameter is never mentioned

`GeneratorParams` includes `scale` (zoom level, 0.25-1.0). The PRD lists every other param in PRD-003/PRD-004/PRD-006 but never mentions `scale`. Is it shared? Is it per-panel? Is it a generator param or a display param? The current type definition says it's a generator param, so should it be in both From and To? The PRD needs to explicitly address this.

### 6. Backward compatibility for shared URLs is ignored

PRD-013 says to remove the old `sa` (seedA) and `sb` (seedB) URL params. But what about every URL that's been shared with those params? They'll silently lose their animation state — the URL will load, animation will be off, and the user won't know why.

**Minimum viable approach**: Parse legacy `sa`/`sb` URL params and at least enable the animation toggle so the user knows animation was intended, even if you can't perfectly reconstruct the old seed-based diff.

### 7. No discussion of sidebar layout feasibility

The current sidebar is 400px wide. We're about to jam TWO full parameter panels into it. `ParametersPanel` already has 11 controls (density, fill amount, fill type, invert fill, gamma, frequency, contrast, seed, directional neighbors, direction density, and the fill type is a dropdown with 6 options). Doubling that is 22+ controls in a scrollable 400px column.

The feature request references `img1.png` for layout but the PRD never addresses:
- Are the From/To panels side-by-side (requiring wider sidebar or responsive layout)?
- Are they stacked vertically (requiring massive scrolling)?
- Are they collapsible/tabbed?
- What happens on smaller viewports?

This is a UX-critical decision that the PRD entirely ignores.

### 8. No "Copy From to To" or "Swap" interactions

The most obvious user workflow is: tweak "From" until it looks good, copy it to "To", then make targeted changes. There's no copy or swap mechanism in this PRD. Users will have to manually match 11 parameters by hand to get a starting point (yes, PRD-007 initializes on first enable, but what about subsequent adjustments?).

Similarly, "Swap From/To" is a natural interaction for previewing the reverse transition. Not mentioned.

---

## Minor Issues

### 9. PRD-009 color authority is unclear

PRD-009 says: *"Use the 'From' config's foreground/background colors for all rendering."* But if PRD-002 makes colors shared, there is no "From config's colors" — colors are global. This sentence is either redundant or reveals confused thinking about the data model.

### 10. No performance discussion

The current seed-based approach varies ONE parameter between two grids. The new approach allows ALL parameters to differ, meaning the two grids can be completely different. This means:
- More cells with `data-g` attributes (potentially ALL cells differ)
- More DOM elements being animated on hover
- `useFragmentReveal` does `querySelectorAll` on potentially thousands of rects

For large canvases (1056x1056 with cellSize 4 = ~69,000+ cells), having most/all of them animate could be noticeably slow. The PRD should at least acknowledge this and specify whether we need to benchmark or throttle.

### 11. Grid view animation behavior is unspecified

The feature request says "Single/Grid view toggle behavior" stays the same. But grid view shows multiple fragments. Does each grid item animate independently? Do they all use the same From/To config? If grid items already have different seeds, how does that interact with the To config? The PRD inherits this ambiguity without addressing it.

### 12. No versioning bump specified

The export format changes significantly (removing `animationSeedA/B`, adding `toConfig`). Is this still `"version": "2.0.0"`? Should it be `"2.1.0"`? The import code validates version prefixed with "2." so it probably still works, but a version bump would make it explicit that the format changed. The PRD doesn't mention it.

---

## Summary

The PRD has good coverage of the core mechanics (state, SVG gen, hover behavior) but fumbles on the design decisions that actually matter: it contradicts the feature request on colors, destroys user state on toggle, punts on layout, leaves the export format ambiguous, and ignores backward compat. Half the items read like someone described the current architecture with minor tweaks, rather than thinking through what the user actually needs.

Fix the contradictions, make actual decisions (not "consider"), and address the UX before handing this to anyone to implement.
