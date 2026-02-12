# Fragment Maker

A procedural SVG generator that creates unique, deterministic visual patterns. Use these SVGs instead of images for a unified digital, low-fi, pixelated aesthetic across your website, print materials, or applications.

## What It Does

Fragment Maker generates SVGs where each "pixel" is a **fragment** - a colored rectangle produced by noise-based algorithms. The same input always produces the same output, making it perfect for:

- Article thumbnails that vary by title
- User avatars based on principal IDs
- Consistent visual branding with controlled variation

## Live Demo

The app is deployed to GitHub Pages at **https://dfinity.github.io/fragment-maker/**. It deploys automatically on every push to `main`.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 to use the interactive tool locally.

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
| `cellSize` | 2-200 | Size of each fragment in pixels |
| `canvasWidth` | number | Canvas width in pixels (default: 1056) |
| `canvasHeight` | number | Canvas height in pixels (default: 1056) |
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

// With custom dimensions
const thumbnail = generateFragmentSvg({
  seed: article.title,
  config: { ...fragmentConfig.config, canvasWidth: 400, canvasHeight: 200 },
});
```

### Function Signature

```typescript
function generateFragmentSvg(options: {
  seed?: string;              // Any string (article title, user ID, etc.). If omitted, uses config.seed directly.
  config: FragmentConfig;     // Configuration from exported JSON (set canvasWidth/canvasHeight for sizing)
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

### Hover Animation (Diff Transition)

You can animate between two patterns on hover — the "from" pattern morphs into the "to" pattern by toggling individual cells. This uses a single SVG with `data-g` attributes, so there's no stacking or opacity conflicts with opaque backgrounds.

The two patterns can be fully independent configs (different threshold, frequency, fill, etc.) or the same config with different seed strings for per-item variation (e.g. one seed per blog post).

#### Files to Copy

1. `src/lib/generateFragmentSvg.ts` — Core generator (you already need this)
2. `src/hooks/useFragmentReveal.ts` — Animation hook (React)
3. `src/hooks/useReducedMotion.ts` — Dependency of the above
4. `src/hooks/useFragmentSize.ts` — Responsive container sizing (optional, React)

#### Usage (React)

```tsx
import { useRef, useMemo } from 'react';
import { generateFragmentDiffFromConfigs, type FragmentConfig } from './generateFragmentSvg';
import { useFragmentReveal } from './hooks/useFragmentReveal';

// Load your exported JSON (contains config and optionally toConfig)
const fragmentExport = await fetch('/fragment-config.json').then(r => r.json());

// Option 1: Two independent configs (designed in the Fragment Maker UI)
function FragmentCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateFragmentDiffFromConfigs({
      fromConfig: fragmentExport.config,
      toConfig: fragmentExport.toConfig,
    }),
    []
  );

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(containerRef, true);

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Option 2: Same config with per-item seed strings (e.g. blog posts)
function BlogPostCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateFragmentDiffFromConfigs({
      fromConfig: fragmentExport.config,
      toConfig: fragmentExport.toConfig,
      fromSeed: title,              // Each post gets a unique "from" pattern
      toSeed: title + '-hover',     // ...and a unique "to" pattern
    }),
    [title]
  );

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(containerRef, true);

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

#### How It Works

1. `generateFragmentDiffFromConfigs` generates two grids (one per config) and renders a single SVG:
   - Cells in **both** grids → always visible (no attribute)
   - Cells only in **from** → `data-g="a"` (visible initially)
   - Cells only in **to** → `data-g="b"` (hidden initially, `opacity: 0`)
   - If `fromSeed`/`toSeed` are provided, the config's `seedParam` (default: `frequency`) is overridden with a deterministic value derived from the seed string
2. `useFragmentReveal` queries these rects from the DOM
3. On **mouseEnter**: from-rects turn off and to-rects turn on in shuffled batches (~20 animation frames)
4. On **mouseLeave**: reverses the animation
5. Respects `prefers-reduced-motion` (instant swap instead of animation)

#### Without React

The diff SVG generation is framework-agnostic. For vanilla JS, generate the SVG and manipulate the `data-g` rects yourself:

```js
import { generateFragmentDiffFromConfigs } from './generateFragmentSvg';

const svg = generateFragmentDiffFromConfigs({
  fromConfig: fragmentExport.config,
  toConfig: fragmentExport.toConfig,
  fromSeed: 'user-123',
  toSeed: 'user-123-hover',
});
container.innerHTML = svg;

const svgEl = container.querySelector('svg');
const aRects = svgEl.querySelectorAll('rect[data-g="a"]');
const bRects = svgEl.querySelectorAll('rect[data-g="b"]');

// On hover: hide from, show to
aRects.forEach(r => r.style.opacity = '0');
bRects.forEach(r => r.style.opacity = '1');

// On leave: show from, hide to
aRects.forEach(r => r.style.opacity = '');
bRects.forEach(r => r.style.opacity = '0');
```

#### Responsive Container Sizing

By default, the SVG is generated at the fixed `canvasWidth`/`canvasHeight` from your config. If you need the SVG to fill a dynamically-sized container (e.g. a fluid card layout), use `useFragmentSize` to observe the container and regenerate the SVG when it resizes.

The hook watches the container with a `ResizeObserver` and returns its dimensions, but only triggers a re-render when the size changes by at least one full `cellSize` — avoiding unnecessary SVG regeneration on sub-pixel resize events.

```tsx
import { useRef, useMemo } from 'react';
import { generateFragmentDiffFromConfigs, type FragmentConfig } from './generateFragmentSvg';
import { useFragmentReveal } from './hooks/useFragmentReveal';
import { useFragmentSize } from './hooks/useFragmentSize';

const fragmentExport = await fetch('/fragment-config.json').then(r => r.json());
const fromConfig: FragmentConfig = fragmentExport.config;
const toConfig: FragmentConfig = fragmentExport.toConfig;

function ResponsiveFragmentCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe container size, snapped to cellSize boundaries
  const size = useFragmentSize(containerRef, fromConfig.cellSize);

  const svg = useMemo(() => {
    if (!size) return '';
    return generateFragmentDiffFromConfigs({
      fromConfig: { ...fromConfig, canvasWidth: size.width, canvasHeight: size.height },
      toConfig: { ...toConfig, canvasWidth: size.width, canvasHeight: size.height },
      fromSeed: title,
      toSeed: title + '-hover',
    });
  }, [size, title]);

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(containerRef, !!svg);

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ width: '100%', aspectRatio: '16/9' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

If you don't need responsive sizing, skip `useFragmentSize` and use the fixed dimensions from your config directly (as shown in the examples above).

## Project Structure

```
src/
├── lib/
│   ├── generateFragmentSvg.ts      # Core generator (copy this to your website)
│   ├── generateFragmentSvgGrid.ts  # Grid variation utilities
│   ├── dimensionUtils.ts           # Canvas dimension helpers
│   └── urlState.ts                 # URL state management
├── hooks/
│   ├── useFragmentReveal.ts        # Hover animation hook (copy this for React projects)
│   ├── useFragmentSize.ts          # Responsive container sizing hook (optional)
│   └── useReducedMotion.ts         # Reduced motion media query hook
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
