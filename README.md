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
| `animationDuration` | 100-5000 | Animation duration in milliseconds (default: 600) |

## Website Integration

The core generator is a **self-contained, dependency-free module** designed to be copied to other projects. The features below are independent and composable — pick what you need:

| Feature | File(s) to copy | Framework |
|---------|-----------------|-----------|
| SVG generation | `src/implementation-files/generateFragmentSvg.ts` | Any |
| Hover animation | + `src/implementation-files/useFragmentReveal.ts`, `useReducedMotion.ts` | React |
| Responsive sizing | + `src/implementation-files/useFragmentSize.ts` | React |

### Static SVG

The simplest use case: generate a single static SVG from your exported config.

```typescript
import { generateFragmentSvg, type FragmentConfig } from './generateFragmentSvg';

const fragmentExport = await fetch('/fragment-config.json').then(r => r.json());

// Fixed dimensions from config
document.getElementById('hero').innerHTML = generateFragmentSvg({
  config: fragmentExport.config,
});
```

### Per-item Seeding

Pass a `seed` string to vary the pattern deterministically per item. The seed is hashed and used to modify one parameter (default: `frequency`). Same string = same SVG, every time.

```typescript
// Each article gets a unique but stable pattern
document.getElementById('thumbnail').innerHTML = generateFragmentSvg({
  seed: article.title,
  config: fragmentExport.config,
});
```

You can change which parameter varies by setting `seedParam` in your config:

```json
{
  "config": {
    "seedParam": "threshold"
  }
}
```

Available seedable parameters: `threshold`, `gamma`, `frequency`, `contrast`, `directionalNeighbors`, `directionDensity`, `fillAmount`

### Hover Animation

Animate between two patterns on hover — the "from" pattern morphs into the "to" pattern by toggling individual cells. This uses a single SVG with `data-g` attributes, so there's no stacking or opacity conflicts with opaque backgrounds.

The two patterns come from independent configs designed in the Fragment Maker UI. When animation is enabled, the exported JSON contains both `config` (from), `toConfig` (to), and `animation` (settings like duration).

#### How it works

1. `generateFragmentDiffFromConfigs` generates two grids (one per config) and renders a single SVG:
   - Cells in **both** grids → always visible (no attribute)
   - Cells only in **from** → `data-g="a"` (visible initially)
   - Cells only in **to** → `data-g="b"` (hidden initially, `opacity: 0`)
2. `useFragmentReveal` queries these rects from the DOM
3. On **mouseEnter**: from-rects turn off and to-rects turn on in shuffled batches over the specified duration
4. On **mouseLeave**: reverses the animation
5. Respects `prefers-reduced-motion` (instant swap instead of animation)

The animation duration is configurable (default: 600ms). Exported configs include `animation: { duration: 600 }` when animation is enabled.

#### React

```tsx
import { useRef, useMemo } from 'react';
import { generateFragmentDiffFromConfigs } from './generateFragmentSvg';
import { useFragmentReveal } from './hooks/useFragmentReveal';

const fragmentExport = await fetch('/fragment-config.json').then(r => r.json());

function FragmentCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateFragmentDiffFromConfigs({
      fromConfig: fragmentExport.config,
      toConfig: fragmentExport.toConfig,
    }),
    []
  );

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(
    containerRef,
    fragmentExport.animation?.duration ?? 600  // Optional: control animation speed
  );

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

#### Vanilla JS

The SVG generation is framework-agnostic. For vanilla JS, manipulate the `data-g` rects yourself:

```js
import { generateFragmentDiffFromConfigs } from './generateFragmentSvg';

const svg = generateFragmentDiffFromConfigs({
  fromConfig: fragmentExport.config,
  toConfig: fragmentExport.toConfig,
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

#### Combining animation with per-item seeding

Pass `fromSeed`/`toSeed` to give each item a unique animated pair. Both patterns are derived from the same configs but varied by the seed string:

```tsx
function BlogPostCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateFragmentDiffFromConfigs({
      fromConfig: fragmentExport.config,
      toConfig: fragmentExport.toConfig,
      fromSeed: title,              // Unique "from" pattern per post
      toSeed: title + '-hover',     // Unique "to" pattern per post
    }),
    [title]
  );

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(
    containerRef,
    fragmentExport.animation?.duration ?? 600
  );

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

### Responsive Container Sizing

By default, the SVG is generated at the fixed `canvasWidth`/`canvasHeight` from your config. If you need the SVG to fill a dynamically-sized container (e.g. a fluid card layout), use `useFragmentSize` to observe the container and regenerate the SVG at the right dimensions.

The hook watches the container with a `ResizeObserver` and returns its size, but only triggers a re-render when the size changes by at least one full `cellSize` — avoiding unnecessary SVG regeneration on sub-pixel resize events.

Works with both static and animated SVGs:

```tsx
import { useRef, useMemo } from 'react';
import { generateFragmentSvg } from './generateFragmentSvg';
import { useFragmentSize } from './hooks/useFragmentSize';

const fragmentExport = await fetch('/fragment-config.json').then(r => r.json());

// Static SVG that fills its container
function ResponsiveFragment({ seed }: { seed: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize);

  const svg = useMemo(() => {
    if (!size) return '';
    return generateFragmentSvg({
      seed,
      config: { ...fragmentExport.config, canvasWidth: size.width, canvasHeight: size.height },
    });
  }, [size, seed]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', aspectRatio: '16/9' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

For animated + responsive, combine `useFragmentSize` with `useFragmentReveal`:

```tsx
import { generateFragmentDiffFromConfigs } from './generateFragmentSvg';
import { useFragmentReveal } from './hooks/useFragmentReveal';
import { useFragmentSize } from './hooks/useFragmentSize';

function ResponsiveAnimatedCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize);

  const svg = useMemo(() => {
    if (!size) return '';
    return generateFragmentDiffFromConfigs({
      fromConfig: { ...fragmentExport.config, canvasWidth: size.width, canvasHeight: size.height },
      toConfig: { ...fragmentExport.toConfig, canvasWidth: size.width, canvasHeight: size.height },
      fromSeed: title,
      toSeed: title + '-hover',
    });
  }, [size, title]);

  const { onMouseEnter, onMouseLeave } = useFragmentReveal(
    containerRef,
    fragmentExport.animation?.duration ?? 600
  );

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

## Project Structure

```
src/
├── implementation-files/
│   ├── generateFragmentSvg.ts      # Core generator (copy this to your website)
│   ├── useFragmentReveal.ts        # Hover animation hook (copy this for React projects)
│   └── useFragmentSize.ts          # Responsive container sizing hook (optional)
├── lib/
│   ├── generateFragmentSvgGrid.ts  # Grid variation utilities
│   ├── dimensionUtils.ts           # Canvas dimension helpers
│   └── urlState.ts                 # URL state management
├── hooks/
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
