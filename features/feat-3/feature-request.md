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
3. Display divisors between a **dynamic minimum** and **200px** as selectable buttons. The dynamic minimum is `max(2, ceil(max(width, height) * 0.01))` — roughly 1% of the largest dimension, with a floor of 2px. Divisors below this minimum or above 200 are excluded.
4. **Remove the "Custom cell size" freeform input** — it's no longer needed since only valid sizes are shown.
5. If the previously selected cell size is still in the new valid set, keep it selected.
6. If not, **auto-select the nearest valid cell size** to what was previously selected.

**Example:** For dimensions 200 x 350, GCD = 50, divisors of 50 that are ≥ dynamic minimum = **5, 10, 25, 50** — these become the available cell size options.

**Hint for limited options:** When there are 3 or fewer valid cell sizes, show a subtle hint: *"Few valid sizes. Enable Allow cropping for more options."*

**Zero valid sizes (blocking state):** When there are **zero** valid cell sizes in the allowed range (e.g., coprime dimensions like 100×101 where GCD=1), the grid preview and export buttons are **disabled**. A message is shown: *"No valid sizes for these dimensions. Change dimensions or enable Allow cropping."* The user must act before rendering resumes.

### 4. Add an "Allow cropping" option

Add a checkbox labeled **"Allow cropping"** with an info icon. On hover, the tooltip explains:

> "Enabling this allows any cell size, even if it doesn't perfectly divide the SVG dimensions. Fragments at the edge will be cropped."

**Canvas dimensions never change.** The user's entered width and height are always preserved. Only the cells at the grid edges are affected — partial cells are rendered and clipped to the canvas boundary.

When enabled:

- The divisor buttons are **replaced by a slider** (range **dynamic minimum–200**). The slider allows any integer cell size.
  - The slider visually **marks positions** that correspond to GCD divisors (evenly divisible sizes) with tick marks or indicators.
  - When the slider value lands on a divisor of **both** the original width and height, an **"Evenly divisible"** indicator is shown next to the slider.
- A **direction toggle** appears: **Crop width** / **Crop height**, indicating which axis will have cropped (partial) cells at the edge.
  - **Crop width:** the rightmost column of cells may be narrower than the cell size (cropped to fit the canvas width). Only full rows of cells are rendered on the height axis.
  - **Crop height:** the bottom row of cells may be shorter than the cell size (cropped to fit the canvas height). Only full columns of cells are rendered on the width axis.
- Only the chosen axis has cropped (partial) cells; the other axis renders only complete cells.

### 5. Remove all automatic dimension/cell-size adjustment logic

The current system where changing cell size can snap dimensions (and vice versa) should be removed. The new flow is:

- User sets width and height → valid cell sizes are calculated and shown.
- User picks a cell size → grid renders. No dimension adjustment.
- If "Allow cropping" is on → user can enter any cell size, one axis has cropped (partial) cells at the edge, the other axis renders only full cells. Canvas dimensions never change.

## Out of scope

- Aspect ratio (removed entirely)
- "Custom cell size" freeform input in normal mode (removed — replaced by dynamic buttons)
- Automatic dimension snapping when cell size changes (removed)
