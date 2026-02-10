# Fragment Maker

A procedural SVG generator that creates unique, deterministic visual patterns. Use these SVGs instead of images for a unified digital, low-fi, pixelated aesthetic across your website, print materials, or applications.

## What It Does

Fragment Maker generates SVGs where each "pixel" is a **fragment** - a colored rectangle produced by noise-based algorithms. The same input always produces the same output, making it perfect for:

- Article thumbnails that vary by title
- User avatars based on principal IDs
- Consistent visual branding with controlled variation

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 to use the interactive tool.

## Features

### Interactive Tool
- **Single View** - Preview one SVG with full control panel
- **Grid View** - See 20 variations of a parameter at once
- **Real-time editing** - All changes update instantly
- **Export options** - Download SVG, copy to clipboard, export settings as JSON

### Configuration Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `threshold` | 0-1 | Density threshold for noise |
| `gamma` | 0.1-3 | Gamma correction for contrast |
| `frequency` | 0.01-0.5 | Noise frequency/detail level |
| `contrast` | 0.1-3 | Noise contrast adjustment |
| `seed` | 0-1 | Base random seed |
| `directionalNeighbors` | 0-999 | Boundary fragment extent |
| `directionDensity` | 0-999 | Number of boundary fragments |
| `fillAmount` | 0-100 | Fill percentage |
| `fillType` | linear, radial, angular, diamond, square, box | Fill gradient type |
| `invertFill` | boolean | Invert fill direction |
| `foregroundColor` | hex string | Foreground color (supports alpha, e.g. `#ff000080`) |
| `backgroundColor` | hex string | Background color (supports alpha) |
| `cellSize` | 12-96 | Size of each fragment in pixels |
| `canvasSize` | 1K, 2K, 4K | Canvas preset (1056px, 2112px, 4224px) |
| `canvasWidth` | number | Explicit canvas width in pixels (alternative to `canvasSize`) |
| `canvasHeight` | number | Explicit canvas height in pixels (alternative to `canvasSize`) |
| `allowCropping` | boolean | Enable partial cells at edges |
| `cropDirection` | width, height | Which axis to crop |

## Website Integration

The core generator is a **self-contained, dependency-free module** designed to be copied to other projects.

### Copy to Your Project

Copy `src/lib/generateFragmentSvg.ts` to your website. That's it - no dependencies required.

### Usage

```typescript
import { generateFragmentSvg, type FragmentConfig } from './generateFragmentSvg';

// Load config from exported JSON
const fragmentConfig = await fetch('/fragment-config.json').then(r => r.json());

// Generate SVG from a seed string
const svg = generateFragmentSvg({
  seed: article.title,       // Seed string - same string = same SVG
  config: fragmentConfig.config,
});

// Use it
document.getElementById('thumbnail').innerHTML = svg;

// With output sizing
const thumbnail = generateFragmentSvg({
  seed: article.title,
  config: fragmentConfig.config,
  width: 400,
  height: 200,
  maintainProportions: true,  // Scale cell size to preserve visual pattern
});
```

### Function Signature

```typescript
function generateFragmentSvg(options: {
  seed?: string;              // Any string (article title, user ID, etc.). If omitted, uses config.seed directly.
  config: FragmentConfig;     // Configuration from exported JSON
  width?: number;             // Optional output width in pixels
  height?: number;            // Optional output height in pixels (defaults to width if only width is set)
  maintainProportions?: boolean; // Scale cell size proportionally to preserve visual pattern
}): string                    // Returns SVG markup
```

### How Seeding Works

1. The `seedString` is hashed using djb2 (deterministic, consistent across environments)
2. The hash is normalized to [0, 1]
3. This value modifies one parameter (default: `frequency`)
4. Same seed string = same SVG, every time

You can change which parameter varies by setting `seedParam` in your config:

```json
{
  "config": {
    "seedParam": "threshold",
    ...
  }
}
```

Available seedable parameters: `threshold`, `gamma`, `frequency`, `contrast`, `directionalNeighbors`, `directionDensity`, `fillAmount`

## Project Structure

```
src/
├── lib/
│   ├── generateFragmentSvg.ts      # Core generator (copy this to your website)
│   ├── generateFragmentSvgGrid.ts  # Grid variation utilities
│   ├── dimensionUtils.ts           # Canvas dimension helpers
│   └── urlState.ts                 # URL state management
├── app/
│   └── components/
│       └── AssetGenerator.tsx      # Main UI component
└── main.tsx
```

## Development

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS

```bash
npm run dev      # Start dev server
npm run build    # Production build
```

## License

MIT
