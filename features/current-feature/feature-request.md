# Feature Request: Canvas Dimensions & Aspect Ratio Controls

## Overview

Replace the current "Canvas Size" presets (1K, 2K, 4K) with more flexible controls that allow users to specify exact output dimensions and aspect ratios.

## Current Behavior

- Canvas size is selected from fixed presets: 1K (1056px), 2K (2112px), 4K (4224px)
- All presets are square (1:1 aspect ratio)
- Dimensions are chosen to be divisible by cell sizes, but this isn't communicated to users
- The "1K" label is confusing since the actual dimension is 1056px

## New Behavior

### 1. Aspect Ratio Presets

Display a row of aspect ratio buttons:
- **1:1** (square) - default
- **4:3** (classic/photo)
- **3:2** (35mm photo)
- **16:9** (widescreen)
- **9:16** (portrait/mobile)
- **Custom** (unlocked)

When a preset is selected, it stays "locked" (visually highlighted). Changing the width will automatically recalculate the height to maintain the ratio.

### 2. Custom Aspect Ratio Input

When "Custom" is selected, show two small number inputs for defining the ratio:
- Width ratio (e.g., 16)
- Height ratio (e.g., 9)

This allows any arbitrary ratio like 21:9 or 5:4 without cluttering the preset buttons.

### 3. Output Dimension Inputs

Two number input fields:
- **Width** (in pixels) - the "primary" dimension
- **Height** (in pixels) - calculated automatically when AR is locked

**Behavior:**
- When an aspect ratio is locked (any preset or custom ratio selected):
  - Editing width auto-updates height based on the ratio
  - Height field is read-only (displays calculated value, not editable)
- Width is always the "fixed" dimension; aspect ratio changes affect height only
- Default: 1000px width, 1000px height (1:1 ratio)

### 4. Cell Size Alignment & Snapping

Since the grid is built from cells of a specific size (e.g., 48px), dimensions must be divisible by the cell size to avoid partial cells at edges.

**Snapping behavior:**
- When the user enters a dimension that doesn't divide evenly by the current cell size, snap to the **nearest** valid dimension (could be larger or smaller)
- Show a warning message explaining what happened: *"Dimensions adjusted to [X] x [Y] to align with [N]px cell size. Try a different cell size for other dimension options."*
- The warning should be dismissible and non-blocking

**Example:**
- User enters 1000px width with 48px cell size
- 1000 / 48 = 20.83 (partial cells)
- Nearest options: 960px (20 cells, diff=40) or 1008px (21 cells, diff=8)
- Snap to 1008px because it's closer
- Show warning explaining the adjustment

### 5. Aspect Ratio Display

Show the current aspect ratio in simplified form:
- "1:1" for square
- "4:3" for that preset
- "Custom" when using custom ratio inputs
- Calculate and simplify when dimensions result in a known ratio

### 6. UI Layout Changes

**Remove:**
- The 1K / 2K / 4K buttons

**Keep (unchanged):**
- Cell Scale dropdown in the Parameters section (it affects pattern detail, not output size)
- Zoom controls (25%, 50%, 100%)

**New Canvas Settings section should contain:**
1. Aspect Ratio preset buttons (row)
2. Custom ratio inputs (only visible when Custom selected)
3. Width input field
4. Height input field (or display-only when AR is locked)

### 7. Grid View Compatibility

The grid view displays multiple fragment variations. With non-square aspect ratios:
- Each grid item should maintain its true aspect ratio (no stretching)
- Items may have varying sizes in the grid to accommodate different proportions
- The responsive grid should still work, just with items that aren't all the same shape

## Acceptance Criteria

1. User can select from 5 aspect ratio presets plus custom option
2. User can define custom aspect ratios with two number inputs
3. User can specify exact pixel dimensions for output
4. Width is the primary dimension; changing it updates height (not vice versa) when AR is locked
5. Dimensions snap to cell-aligned values with a clear warning message
6. Grid view displays non-square fragments correctly without distortion
7. Default state: 1000 x 1000px, 1:1 aspect ratio
8. Cell Scale remains in Parameters section, functioning as before

## Out of Scope

- Resolution/DPI settings for print output
- Multiple export format support
- Preset dimension sizes (like "HD 1920x1080" buttons)

## Clarifications (from review)

### Cell Size vs Snapping Priority
- **Primary behavior**: Dimensions entered by user are respected; cell size adjusts to fit
- **Fallback**: If no valid cell size ≥ 8px exists, dimensions snap to align with current cell size
- This means users get their exact dimensions in most cases

### Input Constraints
- Canvas dimensions: 64px - 4096px
- Cell size: 8px - 128px (rename from "Cell Scale")
- Custom aspect ratio values: 1-99 (positive integers)

### Warning Behavior
- Inline toast notification
- Auto-dismisses after 5 seconds
- New warnings replace old (no stacking)
