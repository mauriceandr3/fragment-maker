/**
 * Text Grid Generator
 *
 * Converts text + configuration into a boolean[][] grid compatible
 * with the Fragment pattern system.
 *
 * This is a self-contained module. Font data is passed in as a parameter
 * (typically from the exported config JSON). No external font file needed.
 */

// ============================================================================
// Types
// ============================================================================

/** A glyph is a 2D boolean array: rows × columns. true = filled pixel */
export type Glyph = boolean[][];

/** Map of characters to their glyph definitions */
export type GlyphMap = Record<string, Glyph>;

/** Font definition with metadata */
export interface BitmapFont {
  /** Canonical width (columns) */
  width: number;
  /** Canonical height (rows) */
  height: number;
  /** Character to glyph mapping */
  glyphs: GlyphMap;
}

/** Available font sizes */
export type FontSize = '3x5' | '5x7' | '7x9';

/** Font data: all three font sizes with their glyph definitions */
export type FontData = Record<FontSize, BitmapFont>;

/** Result of font selection */
export interface FontSelection {
  /** Selected font size */
  fontSize: FontSize;
  /** Scale factor (1, 2, 3, ...) */
  scale: number;
  /** Actual rendered height in cells */
  actualHeight: number;
}

/**
 * Serialized glyph: each row is a string where '#' = filled, ' ' = empty.
 * Used in JSON config for compact, human-readable font data.
 */
export type SerializedGlyph = string[];

/** Serialized font: glyphs stored as string arrays instead of boolean arrays */
export interface SerializedBitmapFont {
  width: number;
  height: number;
  glyphs: Record<string, SerializedGlyph>;
}

/** Serialized font data as it appears in the JSON config */
export type SerializedFontData = Record<FontSize, SerializedBitmapFont>;

export type HorizontalAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'center' | 'bottom';

/** Font resolution: locks which bitmap font variant is used for text rendering */
export type FontResolution = 'low' | 'mid' | 'high';

/** Canonical pixel height for each font size */
const FONT_HEIGHTS: Record<FontSize, number> = { '7x9': 9, '5x7': 7, '3x5': 5 };

/** Maps FontResolution to its corresponding FontSize */
const RESOLUTION_FONT: Record<FontResolution, FontSize> = {
  low: '3x5',
  mid: '5x7',
  high: '7x9',
};

/** Minimum charHeight (in cells) required for each resolution at scale 1 */
export const RESOLUTION_MIN_HEIGHT: Record<FontResolution, number> = {
  low: 5,
  mid: 7,
  high: 9,
};

export interface TextConfig {
  /** Text to render */
  text: string;
  /** Target character height in cells */
  charHeight: number;
  /** Horizontal alignment */
  alignment: HorizontalAlignment;
  /** Vertical alignment */
  verticalAlignment: VerticalAlignment;
  /** Whether to wrap text at word boundaries */
  wordWrap: boolean;
  /** Invert mode: text becomes negative space */
  invert: boolean;
  /** Font resolution: locks which bitmap font variant (low=3×5, mid=5×7, high=7×9) */
  fontResolution: FontResolution;
  /** If set, bitmap text for this From/To slot uses this; otherwise global Colors (text/foreground) apply. */
  textColor?: string;
}

export interface TextGridResult {
  /** The generated boolean grid (rows × cols) */
  grid: boolean[][];
  /** Characters in the text that have no glyph definition */
  unsupportedChars: string[];
  /** Total number of lines in the text (including wrapped) */
  totalLines: number;
  /** Number of lines actually visible in the grid */
  visibleLines: number;
  /** True if grid is too small for minimum font (height < 5) */
  gridTooSmall: boolean;
}

// ============================================================================
// Font Serialization (for JSON config)
// ============================================================================

/**
 * Parses serialized font data from a JSON config into runtime FontData.
 * Converts string-based glyphs ('#' = true, ' ' = false) to boolean[][].
 */
export function parseFonts(serialized: SerializedFontData): FontData {
  const result: Partial<FontData> = {};
  const sizes: FontSize[] = ['3x5', '5x7', '7x9'];

  for (const size of sizes) {
    const serializedFont = serialized[size];
    const glyphs: GlyphMap = {};

    for (const [char, rows] of Object.entries(serializedFont.glyphs)) {
      glyphs[char] = rows.map(row => row.split('').map(c => c === '#'));
    }

    result[size] = {
      width: serializedFont.width,
      height: serializedFont.height,
      glyphs,
    };
  }

  return result as FontData;
}

/**
 * Serializes runtime FontData into the compact string format for JSON config.
 * Each glyph row becomes a string where true = '#', false = ' '.
 */
export function serializeFonts(fonts: FontData): SerializedFontData {
  const result: Partial<SerializedFontData> = {};
  const sizes: FontSize[] = ['3x5', '5x7', '7x9'];

  for (const size of sizes) {
    const font = fonts[size];
    const glyphs: Record<string, SerializedGlyph> = {};

    for (const [char, glyph] of Object.entries(font.glyphs)) {
      glyphs[char] = glyph.map(row => row.map(v => v ? '#' : ' ').join(''));
    }

    result[size] = {
      width: font.width,
      height: font.height,
      glyphs,
    };
  }

  return result as SerializedFontData;
}

// ============================================================================
// Font Selection Algorithm
// ============================================================================

/**
 * Selects a font locked to the given resolution, at the largest integer scale
 * that fits within targetHeight.
 *
 * Returns null if targetHeight < RESOLUTION_MIN_HEIGHT[resolution]
 * (i.e. the font cannot fit even at scale 1).
 */
export function selectFontForResolution(
  resolution: FontResolution,
  targetHeight: number
): FontSelection | null {
  const fontSize = RESOLUTION_FONT[resolution];
  const fontHeight = FONT_HEIGHTS[fontSize];
  const scale = Math.floor(targetHeight / fontHeight);
  if (scale < 1) return null;
  return { fontSize, scale, actualHeight: fontHeight * scale };
}

/**
 * Selects the best font + scale combination to maximize rendered height
 * without exceeding the target height.
 *
 * Algorithm:
 * For each font (7x9, 5x7, 3x5), compute:
 *   scale = floor(targetHeight / fontHeight)
 *   actualHeight = fontHeight * scale
 * Select the font+scale combo with the largest actualHeight.
 * Tiebreak: prefer the higher-resolution (larger canonical) font.
 *
 * Returns null if targetHeight < 5 (minimum font 3x5 doesn't fit at scale 1).
 */
export function selectFont(targetHeight: number): FontSelection | null {
  if (targetHeight < 5) {
    return null;
  }

  const fontSizes: FontSize[] = ['7x9', '5x7', '3x5'];
  const fontHeights: Record<FontSize, number> = {
    '7x9': 9,
    '5x7': 7,
    '3x5': 5,
  };

  let bestSelection: FontSelection | null = null;

  for (const fontSize of fontSizes) {
    const fontHeight = fontHeights[fontSize];
    const scale = Math.floor(targetHeight / fontHeight);

    if (scale >= 1) {
      const actualHeight = fontHeight * scale;

      // Better if: larger actualHeight, or same actualHeight with higher-resolution font.
      // Since we iterate from highest resolution to lowest, we use > (strict) for tiebreak.
      if (bestSelection === null || actualHeight > bestSelection.actualHeight) {
        bestSelection = { fontSize, scale, actualHeight };
      }
    }
  }

  return bestSelection;
}

// ============================================================================
// Core Implementation
// ============================================================================

function createEmptyGrid(cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(false));
  }
  return grid;
}

function createFilledGrid(cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(true));
  }
  return grid;
}

function renderGlyph(
  grid: boolean[][],
  glyph: boolean[][],
  startX: number,
  startY: number,
  scale: number,
  invert: boolean
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < glyph[gy].length; gx++) {
      const pixelOn = glyph[gy][gx];
      const cellValue = invert ? !pixelOn : pixelOn;

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const cellX = startX + gx * scale + sx;
          const cellY = startY + gy * scale + sy;

          if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
            grid[cellY][cellX] = cellValue;
          }
        }
      }
    }
  }
}

/**
 * Normalizes smart/curly quotes and typographic dashes to their plain ASCII equivalents.
 * Handles characters commonly inserted by OS autocorrect (e.g. macOS smart quotes).
 */
function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'") // ' ' → '
    .replace(/[\u201C\u201D]/g, '"') // " " → "
    .replace(/[\u2013\u2014]/g, '-'); // – — → -
}

/**
 * Checks if a character is supported by the given fonts.
 */
function isCharSupported(char: string, fonts: FontData): boolean {
  return char.toUpperCase() in fonts['3x5'].glyphs;
}

/**
 * Calculates the pixel width of a line of text.
 */
function calculateLineWidth(
  line: string,
  font: BitmapFont,
  scale: number,
  fonts: FontData
): number {
  const charSpacing = 1 * scale;
  const glyphWidth = font.width * scale;

  let width = 0;
  let charCount = 0;

  for (const char of line.toUpperCase()) {
    if (!isCharSupported(char, fonts)) continue;
    if (charCount > 0) {
      width += charSpacing;
    }
    width += glyphWidth;
    charCount++;
  }

  return width;
}

/**
 * Generates a boolean[][] grid from text configuration.
 *
 * @param config Text configuration
 * @param cols Number of columns in the output grid
 * @param rows Number of rows in the output grid
 * @param fonts Font data (from parseFonts() or directly from BitmapFont definitions)
 * @returns TextGridResult with grid and validation metadata
 */
export function generateTextGrid(
  config: TextConfig,
  cols: number,
  rows: number,
  fonts: FontData
): TextGridResult {
  const { charHeight, alignment, verticalAlignment, wordWrap, invert, fontResolution } = config;
  const text = normalizeText(config.text);

  // Track unsupported characters
  const unsupportedChars: string[] = [];
  const upperText = text.toUpperCase();
  for (const char of upperText) {
    if (char !== '\n' && !isCharSupported(char, fonts) && !unsupportedChars.includes(char)) {
      unsupportedChars.push(char);
    }
  }

  // Select font locked to the chosen resolution
  const fontSelection = selectFontForResolution(fontResolution, charHeight);

  // If grid is too small for any font
  if (fontSelection === null) {
    const grid = invert ? createFilledGrid(cols, rows) : createEmptyGrid(cols, rows);
    return {
      grid,
      unsupportedChars,
      totalLines: 0,
      visibleLines: 0,
      gridTooSmall: true,
    };
  }

  const { fontSize, scale } = fontSelection;
  const font = fonts[fontSize];
  const glyphWidth = font.width * scale;
  const glyphHeight = font.height * scale;
  const charSpacing = 1 * scale;
  const lineSpacing = 2 * scale;

  // Handle empty text or all-space text
  const trimmedText = text.trim();
  if (trimmedText === '') {
    const grid = invert ? createFilledGrid(cols, rows) : createEmptyGrid(cols, rows);
    return {
      grid,
      unsupportedChars: [],
      totalLines: 0,
      visibleLines: 0,
      gridTooSmall: false,
    };
  }

  // Split text into lines (handle explicit newlines)
  const rawLines = text.split('\n');

  // Process lines: word wrap if enabled, otherwise truncate at character boundary
  const processedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (wordWrap) {
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
        const testWidth = calculateLineWidth(testLine, font, scale, fonts);

        if (testWidth <= cols) {
          currentLine = testLine;
        } else {
          if (currentLine !== '') {
            processedLines.push(currentLine);
          }

          const wordWidth = calculateLineWidth(word, font, scale, fonts);
          if (wordWidth <= cols) {
            currentLine = word;
          } else {
            let truncatedWord = '';
            for (const char of word) {
              const newWord = truncatedWord + char;
              const newWidth = calculateLineWidth(newWord, font, scale, fonts);
              if (newWidth <= cols) {
                truncatedWord = newWord;
              } else {
                break;
              }
            }
            processedLines.push(truncatedWord);
            currentLine = '';
          }
        }
      }

      if (currentLine !== '') {
        processedLines.push(currentLine);
      } else if (rawLine === '') {
        processedLines.push('');
      }
    } else {
      let truncatedLine = '';
      for (const char of rawLine) {
        const testLine = truncatedLine + char;
        const testWidth = calculateLineWidth(testLine, font, scale, fonts);
        if (testWidth <= cols) {
          truncatedLine = testLine;
        } else {
          break;
        }
      }
      processedLines.push(truncatedLine);
    }
  }

  const totalLines = processedLines.length;

  const calculateBlockHeight = (lineCount: number): number => {
    if (lineCount === 0) return 0;
    return lineCount * glyphHeight + (lineCount - 1) * lineSpacing;
  };

  let visibleLines = 0;
  for (let i = 1; i <= totalLines; i++) {
    if (calculateBlockHeight(i) <= rows) {
      visibleLines = i;
    } else {
      break;
    }
  }

  const grid = invert ? createFilledGrid(cols, rows) : createEmptyGrid(cols, rows);

  if (visibleLines === 0) {
    return {
      grid,
      unsupportedChars,
      totalLines,
      visibleLines: 0,
      gridTooSmall: false,
    };
  }

  const blockHeight = calculateBlockHeight(visibleLines);
  let startY: number;
  switch (verticalAlignment) {
    case 'top':
      startY = 0;
      break;
    case 'center':
      startY = Math.floor((rows - blockHeight) / 2);
      break;
    case 'bottom':
      startY = rows - blockHeight;
      break;
  }

  const linesToRender = processedLines.slice(0, visibleLines);

  for (let lineIndex = 0; lineIndex < linesToRender.length; lineIndex++) {
    const line = linesToRender[lineIndex];
    const lineWidth = calculateLineWidth(line, font, scale, fonts);

    let startX: number;
    switch (alignment) {
      case 'left':
        startX = 0;
        break;
      case 'center':
        startX = Math.floor((cols - lineWidth) / 2);
        break;
      case 'right':
        startX = cols - lineWidth;
        break;
    }

    const lineY = startY + lineIndex * (glyphHeight + lineSpacing);

    let currentX = startX;
    for (const char of line.toUpperCase()) {
      if (!isCharSupported(char, fonts)) continue;

      const glyph = font.glyphs[char];
      if (glyph) {
        renderGlyph(grid, glyph, currentX, lineY, scale, invert);
        currentX += glyphWidth + charSpacing;
      }
    }
  }

  return {
    grid,
    unsupportedChars,
    totalLines,
    visibleLines,
    gridTooSmall: false,
  };
}
