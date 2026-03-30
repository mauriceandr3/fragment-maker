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
- **Export options** - Download SVG, copy to clipboard, export settings as JSON, export animation as MP4

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
| `elongateAxis` | none, width, height | Stretch cells along an axis (default: none) |
| `elongateAmount` | 2-12 | Stretch multiplier (e.g. 4 with width → cells are 4× wider) |
| `colorMode` | mono, duo, tri | Color mode (default: mono). `duo` uses 2 foreground colors, `tri` uses 3. |
| `colors` | string[] | Array of foreground colors (hex). Length matches colorMode (2 for duo, 3 for tri). |
| `colorProportions` | number[] | Proportion of cells per color (0-1 values summing to 1, e.g. `[0.4, 0.3, 0.3]`). |
| `animationDuration` | 100-5000 | Animation duration in milliseconds (default: 600) |

## Website Integration

Copy **one file** to your project:

```bash
npm run bundle   # generates bundle/fragment-maker.ts
```

Copy `bundle/fragment-maker.ts` into your project. It contains everything: SVG generation, text rendering, hover animation (React), and responsive sizing (React).

The high-level API (`generateSvgFromExport`, `generateDiffSvgFromExport`) accepts the exported JSON directly and handles everything — pattern, text, or any combination — so your component code stays the same regardless of config type.

> **Advanced:** The source files are in `src/implementation-files/` if you prefer to copy individual modules instead of the bundle.

### Static SVG

Works for both pattern and text configs — no conditional logic needed.

```typescript
import { generateSvgFromExport, type FragmentExport } from './fragment-maker';

const fragmentExport: FragmentExport = await fetch('/fragment-config.json').then(r => r.json());

document.getElementById('hero').innerHTML = generateSvgFromExport(fragmentExport);
```

### Per-item Variation

#### Pattern configs — seeding

Pass a `seed` string to vary pattern configs deterministically per item. Same string = same SVG, every time.

```typescript
document.getElementById('thumbnail').innerHTML = generateSvgFromExport(fragmentExport, {
  seed: article.title,
});
```

You can change which parameter varies by setting `seedParam` in your config. Available: `threshold`, `gamma`, `frequency` (default), `contrast`, `directionalNeighbors`, `directionDensity`, `fillAmount`

#### Text configs — text override

Pass a `text` string to override the rendered text at runtime:

```typescript
document.getElementById('greeting').innerHTML = generateSvgFromExport(fragmentExport, {
  text: user.name,
});
```

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
import { generateDiffSvgFromExport, useFragmentReveal, type FragmentExport } from './fragment-maker';

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

#### With per-item variation

Pass `fromSeed`/`toSeed` to give each item a unique animated pair (pattern states), and/or `fromText`/`toText` to override text at runtime (text states):

```tsx
// Pattern seeding — each title gets a unique pattern pair
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

```tsx
// Text override — animate from a seeded pattern to the first letter of the title
function ArticleCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(
    () => generateDiffSvgFromExport(fragmentExport, {
      fromSeed: title,
      toText: title.charAt(0),
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
import { generateDiffSvgFromExport } from './fragment-maker';

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

### Export Video

When animation is enabled, the **Export Video** button appears in the control panel. Clicking it renders the animation frame-by-frame and downloads a looping MP4 file (`fragment-animation.mp4`).

**Output:** H.264 MP4, 60 fps, native SVG resolution. The video loops: forward animation → 500ms hold → reverse animation → 500ms hold.

**Browser requirement:** Chrome 94+ or Edge 94+. The button is hidden on unsupported browsers (Firefox, Safari). No install, no ffmpeg — encoding runs entirely in the browser using the [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API).

### Responsive Container Sizing

Use `useFragmentSize` to regenerate the SVG when the container resizes. It snaps dimensions UP to cell boundaries so the SVG fully covers the container — use `overflow-hidden` on the container to clip the small excess at edges.

Pass the config's `elongateAxis` and `elongateAmount` as the third argument so the hook accounts for elongated cells:

```tsx
import { useRef, useMemo } from 'react';
import { generateSvgFromExport, useFragmentSize, type FragmentExport } from './fragment-maker';

function ResponsiveFragment({ seed }: { seed: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize, {
    elongateAxis: fragmentExport.config.elongateAxis,
    elongateAmount: fragmentExport.config.elongateAmount,
  });

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
      style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

For animated + responsive, combine `useFragmentSize` with `useFragmentReveal`:

```tsx
import { generateDiffSvgFromExport, useFragmentReveal, useFragmentSize } from './fragment-maker';

function ResponsiveAnimatedCard({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useFragmentSize(containerRef, fragmentExport.config.cellSize, {
    elongateAxis: fragmentExport.config.elongateAxis,
    elongateAmount: fragmentExport.config.elongateAmount,
  });

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
      style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

### Text Config Editability

When a config uses text, the exported JSON includes full font data (all characters at all three sizes, ~12KB). Consumers can freely modify these fields in the exported JSON without re-exporting:

- **`fromTextConfig.text`** / **`toTextConfig.text`** — any text using A-Z, 0-9, and common punctuation
- **`charHeight`** — character height in cells; the font scales to fill as many cells as possible at integer steps
- **`fontResolution`** — bitmap font variant: `'low'` (3×5), `'mid'` (5×7), or `'high'` (7×9); determines detail level and minimum charHeight (5, 7, or 9 respectively)
- **`alignment`**, **`verticalAlignment`**, **`wordWrap`**, **`invert`** — layout parameters

Alternatively, use the `text` / `fromText` / `toText` options to override text at render time without modifying the JSON:

```typescript
generateSvgFromExport(exportData, { text: 'Hello' });
generateDiffSvgFromExport(exportData, { fromText: 'Hello', toText: 'World' });
```

## Project Structure

```
bundle/
└── fragment-maker.ts               # ← Copy this one file to your project
scripts/
└── bundle.mjs                      # Build script that generates the bundle
src/
├── implementation-files/            # Source modules (bundled into fragment-maker.ts)
│   ├── generateFragmentSvg.ts      # Core SVG generator
│   ├── generateTextGrid.ts         # Text-to-grid renderer
│   ├── useFragmentReveal.ts        # Hover animation hook (React)
│   └── useFragmentSize.ts          # Responsive container sizing hook (React)
├── lib/
│   ├── bitmapFonts.ts              # Bitmap font definitions (internal)
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
npm run bundle   # Regenerate bundle/fragment-maker.ts
```

## License

MIT
