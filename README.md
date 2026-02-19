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

Copy the implementation files to your project. The high-level API (`generateSvgFromExport`, `generateDiffSvgFromExport`) accepts the exported JSON directly and handles everything — pattern, text, or any combination — so your component code stays the same regardless of config type.

| Feature | File(s) to copy | Framework |
|---------|-----------------|-----------|
| SVG generation (required) | `generateFragmentSvg.ts` + `generateTextGrid.ts` | Any |
| Hover animation | + `useFragmentReveal.ts` + `useReducedMotion.ts` | React |
| Responsive sizing | + `useFragmentSize.ts` | React |

All files are in `src/implementation-files/`. The two core files are always copied together (`generateFragmentSvg.ts` imports from `generateTextGrid.ts`).

### Static SVG

Works for both pattern and text configs — no conditional logic needed.

```typescript
import { generateSvgFromExport, type FragmentExport } from './generateFragmentSvg';

const fragmentExport: FragmentExport = await fetch('/fragment-config.json').then(r => r.json());

document.getElementById('hero').innerHTML = generateSvgFromExport(fragmentExport);
```

### Per-item Seeding

Pass a `seed` string to vary pattern configs deterministically per item. Same string = same SVG, every time.

```typescript
document.getElementById('thumbnail').innerHTML = generateSvgFromExport(fragmentExport, {
  seed: article.title,
});
```

You can change which parameter varies by setting `seedParam` in your config. Available: `threshold`, `gamma`, `frequency` (default), `contrast`, `directionalNeighbors`, `directionDensity`, `fillAmount`

### Hover Animation

Animate between two states on hover. The "from" state morphs into the "to" state by toggling individual cells. Works with all combinations: pattern↔pattern, text↔pattern, text↔text.

#### How it works

1. `generateDiffSvgFromExport` renders a single SVG with `data-g` attributes:
   - Cells in **both** states → always visible
   - Cells only in **from** → `data-g="a"` (visible initially)
   - Cells only in **to** → `data-g="b"` (hidden initially)
2. `useFragmentReveal` animates these rects on hover (shuffled batches)
3. Respects `prefers-reduced-motion` (instant swap)

#### React

```tsx
import { useRef, useMemo } from 'react';
import { generateDiffSvgFromExport, type FragmentExport } from './generateFragmentSvg';
import { useFragmentReveal } from './useFragmentReveal';

const fragmentExport: FragmentExport = await fetch('/fragment-config.json').then(r => r.json());

function FragmentCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(() => generateDiffSvgFromExport(fragmentExport), []);

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

#### With per-item seeding

Pass `fromSeed`/`toSeed` to give each item a unique animated pair (pattern configs only):

```tsx
function BlogPostCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateDiffSvgFromExport(fragmentExport, {
      fromSeed: title,
      toSeed: title + '-hover',
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

#### Vanilla JS

```js
import { generateDiffSvgFromExport } from './generateFragmentSvg';

container.innerHTML = generateDiffSvgFromExport(fragmentExport);

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

### Responsive Container Sizing

Use `useFragmentSize` to regenerate the SVG when the container resizes. It only triggers when the size changes by at least one `cellSize`.

```tsx
import { useRef, useMemo } from 'react';
import { generateSvgFromExport, type FragmentExport } from './generateFragmentSvg';
import { useFragmentSize } from './useFragmentSize';

function ResponsiveFragment({ seed }: { seed: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize);

  const responsiveExport = useMemo(() => {
    if (!size) return null;
    return {
      ...fragmentExport,
      config: { ...fragmentExport.config, canvasWidth: size.width, canvasHeight: size.height },
    };
  }, [size]);

  const svg = useMemo(() => {
    if (!responsiveExport) return '';
    return generateSvgFromExport(responsiveExport, { seed });
  }, [responsiveExport, seed]);

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
import { generateDiffSvgFromExport } from './generateFragmentSvg';
import { useFragmentReveal } from './useFragmentReveal';
import { useFragmentSize } from './useFragmentSize';

function ResponsiveAnimatedCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize);

  const responsiveExport = useMemo(() => {
    if (!size) return null;
    return {
      ...fragmentExport,
      config: { ...fragmentExport.config, canvasWidth: size.width, canvasHeight: size.height },
      ...(fragmentExport.toConfig && {
        toConfig: { ...fragmentExport.toConfig, canvasWidth: size.width, canvasHeight: size.height },
      }),
    };
  }, [size]);

  const svg = useMemo(() => {
    if (!responsiveExport) return '';
    return generateDiffSvgFromExport(responsiveExport, {
      fromSeed: title,
      toSeed: title + '-hover',
    });
  }, [responsiveExport, title]);

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

### Text Config Editability

When a config uses text, the exported JSON includes full font data (all characters at all three sizes, ~12KB). Consumers can freely modify these fields in the exported JSON without re-exporting:

- **`fromTextConfig.text`** / **`toTextConfig.text`** — any text using A-Z, 0-9, and common punctuation
- **`charHeight`** — character height in cells (font selection runs at render time)
- **`alignment`**, **`verticalAlignment`**, **`wordWrap`**, **`invert`** — layout parameters

## Project Structure

```
src/
├── implementation-files/
│   ├── generateFragmentSvg.ts      # Core generator (copy this to your website)
│   ├── generateTextGrid.ts         # Text-to-grid renderer (copy for text support)
│   ├── useFragmentReveal.ts        # Hover animation hook (copy this for React projects)
│   └── useFragmentSize.ts          # Responsive container sizing hook (optional)
├── lib/
│   ├── bitmapFonts.ts              # Bitmap font definitions (internal, not copied)
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
