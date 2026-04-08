#!/usr/bin/env node

/**
 * Bundle Script
 *
 * Combines all implementation files into a single TypeScript file
 * that consumers can copy to their project.
 *
 * Usage: node scripts/bundle.mjs
 * Output: bundle/fragment-maker.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const implDir = join(root, 'src', 'implementation-files');
const hooksDir = join(root, 'src', 'hooks');
const libDir = join(root, 'src', 'lib');
const outDir = join(root, 'bundle');

// Read source files
const files = {
  generateTextGrid: readFileSync(join(implDir, 'generateTextGrid.ts'), 'utf-8'),
  logoRegistry: readFileSync(join(libDir, 'logoRegistry.ts'), 'utf-8'),
  logoOverlay: readFileSync(join(implDir, 'logoOverlay.ts'), 'utf-8'),
  textOverlay: readFileSync(join(implDir, 'textOverlay.ts'), 'utf-8'),
  imageOverlay: readFileSync(join(implDir, 'imageOverlay.ts'), 'utf-8'),
  generateFragmentSvg: readFileSync(join(implDir, 'generateFragmentSvg.ts'), 'utf-8'),
  animationUtils: readFileSync(join(libDir, 'animationUtils.ts'), 'utf-8'),
  useReducedMotion: readFileSync(join(hooksDir, 'useReducedMotion.ts'), 'utf-8'),
  useFragmentReveal: readFileSync(join(implDir, 'useFragmentReveal.ts'), 'utf-8'),
  useFragmentSize: readFileSync(join(implDir, 'useFragmentSize.ts'), 'utf-8'),
};

/**
 * Strip import statements that reference local files (not external packages).
 * Handles both single-line and multi-line imports.
 */
function stripLocalImports(source) {
  // Match single-line: import ... from '../...' or import ... from './' or import ... from '@/...'
  // Match multi-line:  import {\n  ...\n} from '../...'
  return source.replace(
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|[\w]+)\s+from\s+['"](?:\.\.?\/|@\/)[^'"]*['"];?\s*\n?/gs,
    ''
  );
}

/**
 * Strip the top-level JSDoc comment block (file header).
 */
function stripFileHeader(source) {
  const trimmed = source.trimStart();
  if (trimmed.startsWith('/**')) {
    const endIndex = trimmed.indexOf('*/');
    if (endIndex !== -1) {
      return trimmed.slice(endIndex + 2).trimStart();
    }
  }
  return source;
}

/**
 * Collect all 'react' imports from all files and deduplicate them.
 */
function collectReactImports(sources) {
  const allImports = new Set();

  for (const source of sources) {
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') && /from\s+['"]react['"]/.test(trimmed)) {
        // Extract the named imports
        const match = trimmed.match(/import\s*\{([^}]+)\}\s*from\s*['"]react['"]/);
        if (match) {
          match[1].split(',').forEach(name => allImports.add(name.trim()));
        }
      }
    }
  }

  if (allImports.size === 0) return '';
  return `import { ${[...allImports].sort().join(', ')} } from 'react';`;
}

/**
 * Strip all react import lines from source.
 */
function stripReactImports(source) {
  return source
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !(trimmed.startsWith('import ') && /from\s+['"]react['"]/.test(trimmed));
    })
    .join('\n');
}

/**
 * Strip pure re-export lines (e.g. `export { foo, bar };` or `export { type Foo, bar };`)
 * These cause duplicate export errors in the single-file bundle since the original
 * exports are already present from the source module.
 */
function stripReExports(source) {
  return source
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Match: export { ... }; (with optional type keyword inside)
      return !(/^export\s*\{[^}]*\}\s*;?\s*$/.test(trimmed) && !trimmed.includes('from'));
    })
    .join('\n');
}

/**
 * Strip section separator comments (the ===... lines).
 */
function stripSectionSeparators(source) {
  return source
    .split('\n')
    .filter(line => !line.includes('// ===='))
    .join('\n');
}

/**
 * Collapse 3+ consecutive blank lines into 2.
 */
function collapseBlankLines(source) {
  return source.replace(/\n{4,}/g, '\n\n\n');
}

// Process each file
function processFile(source) {
  let result = stripLocalImports(source);
  result = stripFileHeader(result);
  result = stripReactImports(result);
  result = stripReExports(result);
  result = stripSectionSeparators(result);
  return result.trim();
}

// Build the bundle
const reactImports = collectReactImports(Object.values(files));

const sections = [
  processFile(files.generateTextGrid),
  processFile(files.logoRegistry),
  processFile(files.logoOverlay),
  processFile(files.textOverlay),
  processFile(files.imageOverlay),
  processFile(files.generateFragmentSvg),
  processFile(files.animationUtils),
  processFile(files.useReducedMotion),
  processFile(files.useFragmentReveal),
  processFile(files.useFragmentSize),
];

// Read version from package.json export format (match what useFragmentActions exports)
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

const header = `/**
 * Fragment Maker — Single-file bundle
 * https://github.com/dfinity/fragment-maker
 *
 * Generated by: npm run bundle
 * Do not edit manually — modify the source files and re-run the script.
 *
 * Copy this single file to your project for full Fragment Maker support:
 * - Pattern and text SVG generation
 * - Hover animation (React)
 * - Responsive container sizing (React)
 *
 * Usage:
 *   import { generateSvgFromExport, generateDiffSvgFromExport, useFragmentReveal } from './fragment-maker';
 */`;

const output = [
  header,
  '',
  reactImports,
  '',
  sections.join('\n\n'),
  '',
].join('\n');

const final = collapseBlankLines(output);

// Write output
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'fragment-maker.ts'), final, 'utf-8');

// Stats
const lineCount = final.split('\n').length;
const sizeKb = (Buffer.byteLength(final, 'utf-8') / 1024).toFixed(1);
console.log(`✓ bundle/fragment-maker.ts (${lineCount} lines, ${sizeKb} KB)`);
