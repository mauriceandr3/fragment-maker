# Feature Request: Simplify Dimension & Cell Size Controls

## Problem

The current controls for dimensions and cell size are coupled in a way that makes the tool frustrating to use. Changing one setting triggers automatic adjustments to others, creating a "wobbly" experience where the user never feels in control. Specifically:

- **Aspect ratio** constrains height, which cascades into cell size adjustments.
- **Cell size presets** that don't evenly divide the current dimensions trigger warnings and silently switch to a "custom" nearest-fit value.
- **Width input is effectively broken** — automatic adjustments fight the user's input, making it impossible to type a value freely.
- The overall effect: everything affects everything, and the user can't predict what will happen when they change a setting.

## Solution

Establish a clear hierarchy: **dimensions are primary, cell size is derived**.

### 1. Remove the Aspect Ratio control

Delete the aspect ratio preset selector and custom ratio inputs entirely. They add complexity without enough value.

### 2. Make both Width and Height independently editable

- Both fields accept values in the range **64–4096 px** (same validation as current width).
- Width and height are fully independent — changing one does not affect the other.
- Default dimensions on load: keep whatever the current defaults are.

### 3. Replace cell size presets with dynamic valid-size buttons

When dimensions change:

1. Calculate `GCD(width, height)`.
2. Find all divisors of that GCD — these are the cell sizes that evenly tile both dimensions.
3. Display them as selectable buttons (no minimum — show all divisors, including small ones like 1px, 2px, etc.).
4. **Remove the "Custom cell size" freeform input** — it's no longer needed since only valid sizes are shown.
5. If the previously selected cell size is still in the new valid set, keep it selected.
6. If not, **auto-select the nearest valid cell size** to what was previously selected.

**Example:** For dimensions 200 x 350, GCD = 50, divisors = **1, 2, 5, 10, 25, 50** — these become the available cell size options.

### 4. Add an "Allow cropping" option

Add a checkbox labeled **"Allow cropping"** with an info icon. On hover, the tooltip explains:

> "Enabling this allows any cell size, even if it doesn't perfectly divide the SVG dimensions. Fragments at the edge will be cropped."

When enabled:

- A **freeform cell size input** appears (replaces the divisor buttons, or is shown alongside them).
- A **direction toggle** appears: **Horizontal** / **Vertical**, indicating which axis is allowed to be cropped.
  - **Horizontal cropping:** the grid may not fill the full width (right edge is cropped). Height is automatically adjusted to be perfectly divisible by the cell size.
  - **Vertical cropping:** the grid may not fill the full height (bottom edge is cropped). Width is automatically adjusted to be perfectly divisible by the cell size.
- Only the chosen axis gets cropped; the other axis is auto-adjusted to remain perfectly divisible by the cell size.

### 5. Remove all automatic dimension/cell-size adjustment logic

The current system where changing cell size can snap dimensions (and vice versa) should be removed. The new flow is:

- User sets width and height → valid cell sizes are calculated and shown.
- User picks a cell size → grid renders. No dimension adjustment.
- If "Allow cropping" is on → user can enter any cell size, one axis crops, the other auto-adjusts.

## Out of scope

- Aspect ratio (removed entirely)
- "Custom cell size" freeform input in normal mode (removed — replaced by dynamic buttons)
- Automatic dimension snapping when cell size changes (removed)
