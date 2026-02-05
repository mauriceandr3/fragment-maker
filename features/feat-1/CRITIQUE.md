# PRD Critique: Fragment Maker - Grid View Feature

**Reviewer:** Senior Developer
**Date:** 2026-02-04
**Verdict:** NEEDS SIGNIFICANT REWORK

---

## Overview

This PRD attempts to bundle two entirely separate concerns (a grid preview feature AND a portable SVG generation module) into one feature request, and manages to under-specify both of them. Let me count the ways this will blow up in production.

---

## Critical Issues

### 1. "20 SVGs" Is an Arbitrary Magic Number

Why 20? Why not 16 (nice 4x4 grid)? Why not 24 (fits various grid layouts)? The PRD says "20" like it's gospel but provides zero justification. What happens when someone on a 13" laptop can't see all 20? What about someone on a 4K monitor who thinks 20 is pathetically sparse?

**What's actually needed:** Either make it configurable, or document WHY 20 is the right number with actual UX research to back it up.

### 2. Performance Guarantees Are Fantasy

PRD-009 claims we'll render within "500ms" and have "no visible flickering." Based on what? Have you profiled the current SVG generation? What's the complexity? If generating ONE SVG takes 50ms, we're already at 1 second for 20. And that's before React re-renders.

The PRD mentions "memoization" like it's a magic wand. Memoization helps with REPEATED identical inputs. Every SVG in the grid has DIFFERENT parameters. This isn't a memoization problem, it's a parallelization problem - and JavaScript is single-threaded.

**What's actually needed:** Web Workers for parallel generation, or at minimum a virtualized grid that only renders visible items. Debouncing on settings changes. Actual benchmarks from the current implementation.

### 3. The "Modular Function" Is Load-Bearing But Under-Specified

PRD-007 casually mentions extracting SVG generation into a "self-contained module" with "no dependencies on React." Has anyone actually looked at `AssetGenerator.tsx`?

- How is the SVG currently rendered? Canvas API? React DOM? direct string manipulation?
- What exactly constitutes the "generation logic"?
- What are the ACTUAL dependencies we need to untangle?

You can't just say "make it modular" and expect it to happen. This could be a 2-hour task or a 2-week refactor depending on current architecture.

**What's actually needed:** An actual audit of the current codebase showing what needs to be extracted and what the dependency graph looks like.

### 4. Hashing Algorithm Is Unspecified

The feature request says the seed string will be hashed to determine the varying parameter. The PRD doesn't mention the hashing algorithm ONCE.

MD5? SHA-256? djb2? A custom hash?

This is CRITICAL for determinism. If the website uses a different hashing implementation than this tool, you'll get different SVGs. Congratulations, you've defeated the entire purpose of the feature.

**What's actually needed:** Explicit specification of the hashing algorithm, with a reference implementation, and test vectors to verify consistency.

### 5. No Error Handling Whatsoever

What happens when:
- A parameter's min equals its max? Division by zero in the distribution calculation?
- The hashed seed produces a value outside the parameter's range?
- SVG generation fails for one of the 20 items?
- The browser runs out of memory rendering 20 complex SVGs?
- The user's exported JSON is malformed?

The PRD assumes happy path only. That's not how software works.

### 6. Grid Layout Is Hand-Waved

PRD-002 says "responsive grid layout (e.g., 4x5 or 5x4)" - so which is it? What breakpoints? What's the minimum SVG size before we reduce columns?

What about the aspect ratio problem? If someone configures a 16:9 canvas, forcing it into a square preview will either crop, letterbox, or distort. The PRD doesn't address this AT ALL.

**What's actually needed:** Actual responsive design specifications with breakpoints and aspect ratio handling strategy.

### 7. UX Dead Ends

So the user sees 20 variations. Great. Then what?

- Can they click one to use those exact settings?
- Can they export a specific variation from the grid?
- Can they hover to see the exact parameter value used?
- How do they know which variation corresponds to which seed value?

The grid is a preview tool with no way to ACT on what you see. It's a museum where you can look but not touch.

### 8. The JSON Export Format Is Incomplete

PRD-006 lists parameters but doesn't specify:
- The actual JSON schema
- Required vs optional fields
- Value formats (are colors hex strings? RGB objects?)
- Validation rules
- What "version" means and how versioning works

Also, `seedParam` is listed but there's no corresponding import functionality. The JSON is write-only? What's the point?

### 9. "Byte-Identical" Output Is Unrealistic

PRD-010 claims we can achieve "byte-identical" SVGs across Single view, Grid view, and the modular function.

SVG string formatting (attribute order, whitespace, number precision) can vary based on how you generate it. Unless you're using the EXACT same serialization code path, this is not guaranteed.

Also, floating-point arithmetic can produce slightly different results across different JavaScript engines. "Identical" is harder than it sounds.

**What's actually needed:** Either relax this to "visually identical" with defined tolerance, or mandate a canonical SVG serialization format.

### 10. Scope Creep Is Built In

This "feature" is actually THREE features:
1. Grid view UI
2. Modular SVG generation library
3. JSON export/import

They have different stakeholders, different testing requirements, and different release criteria. Bundling them guarantees that one will block the others.

---

## Missing Considerations

### Accessibility
- No keyboard navigation for the grid
- No screen reader considerations
- No reduced motion support for "real-time" updates

### Mobile/Touch
- Grid view on mobile? With the settings panel?
- Touch targets for the parameter toggles?

### State Management
- What happens if you switch from Grid to Single view - do you lose your toggle selection?
- Is view mode persisted across sessions?

### Loading States
- 20 SVGs generating simultaneously - is there a loading indicator?
- Do they render one by one or all at once?

---

## Parameter Distribution Edge Cases

The PRD says values are "distributed evenly from min to max" with "index 0 uses minimum, index 19 uses maximum."

What about:
- **Integer-only parameters:** If a parameter can only be 1-5, you can't have 20 evenly distributed values
- **Logarithmic parameters:** Some visual parameters feel linear on a log scale
- **Boolean/enum parameters:** Can't vary these continuously
- **Parameters with sweet spots:** Most useful values might be in a narrow range, not min-to-max

---

## Recommendations

1. **Split this into 3 separate PRDs** with clear dependencies
2. **Audit the current codebase first** before making architectural assumptions
3. **Specify the hashing algorithm** with test vectors
4. **Define actual responsive behavior** with mockups at different viewports
5. **Add error handling requirements** for every edge case
6. **Prototype performance** before committing to "500ms" SLAs
7. **Define user interaction patterns** for the grid beyond just viewing
8. **Create a proper JSON schema** with versioning strategy

---

## Conclusion

This PRD reads like someone wrote down a wish list and called it a specification. Half of it is "e.g." and "such as" - that's not requirements, that's brainstorming.

Ship this as-is and we'll be in bug-fix mode for a month. Do the hard work of actually specifying the behavior first.

*-- Reviewer who has cleaned up enough under-specified features to know better*
