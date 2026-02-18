/**
 * Text Grid Generator
 *
 * Converts text + configuration into a boolean[][] grid compatible
 * with the Fragment pattern system.
 */

import { selectFont, getFont, isCharSupported, type FontSize } from './bitmapFonts';

// ============================================================================
// Types
// ============================================================================

export type HorizontalAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'center' | 'bottom';

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
// Core Implementation
// ============================================================================

/**
 * Creates an empty grid (all false) of specified dimensions.
 */
function createEmptyGrid(cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(false));
  }
  return grid;
}

/**
 * Creates a filled grid (all true) of specified dimensions.
 */
function createFilledGrid(cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(true));
  }
  return grid;
}

/**
 * Renders a single glyph onto the grid at the specified position with scaling.
 * @param grid The grid to render onto (mutated in place)
 * @param glyph The boolean[][] glyph to render
 * @param startX The starting X position (column)
 * @param startY The starting Y position (row)
 * @param scale The scaling factor (each glyph pixel becomes scale×scale cells)
 * @param invert Whether to render as negative space (false cells in filled grid)
 */
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
      // In normal mode, set true for filled pixels
      // In invert mode, set false for filled pixels (they become holes)
      const cellValue = invert ? !pixelOn : pixelOn;

      // Scale the pixel: each glyph pixel becomes scale×scale cells
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
 * Calculates the pixel width of a line of text (excluding trailing space).
 */
function calculateLineWidth(
  line: string,
  fontSize: FontSize,
  scale: number
): number {
  const font = getFont(fontSize);
  const charSpacing = 1 * scale; // 1 cell gap between chars at 1x scale
  const glyphWidth = font.width * scale;

  let width = 0;
  let charCount = 0;

  for (const char of line.toUpperCase()) {
    if (!isCharSupported(char)) continue;
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
 * @returns TextGridResult with grid and validation metadata
 */
export function generateTextGrid(
  config: TextConfig,
  cols: number,
  rows: number
): TextGridResult {
  const { text, charHeight, alignment, verticalAlignment, wordWrap, invert } = config;

  // Track unsupported characters
  const unsupportedChars: string[] = [];
  const upperText = text.toUpperCase();
  for (const char of upperText) {
    if (char !== '\n' && !isCharSupported(char) && !unsupportedChars.includes(char)) {
      unsupportedChars.push(char);
    }
  }

  // Select font based on target character height
  const fontSelection = selectFont(charHeight);

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
  const font = getFont(fontSize);
  const glyphWidth = font.width * scale;
  const glyphHeight = font.height * scale;
  const charSpacing = 1 * scale; // 1 cell gap at 1x
  const lineSpacing = 2 * scale; // 2 cell gap at 1x

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
      // Word wrap: break at word boundaries to fit within grid width
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
        const testWidth = calculateLineWidth(testLine, fontSize, scale);

        if (testWidth <= cols) {
          currentLine = testLine;
        } else {
          // Current line is full, push it and start new line with this word
          if (currentLine !== '') {
            processedLines.push(currentLine);
          }

          // Check if single word fits
          const wordWidth = calculateLineWidth(word, fontSize, scale);
          if (wordWidth <= cols) {
            currentLine = word;
          } else {
            // Word is too long, truncate at character boundary
            let truncatedWord = '';
            for (const char of word) {
              const newWord = truncatedWord + char;
              const newWidth = calculateLineWidth(newWord, fontSize, scale);
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

      // Push remaining content
      if (currentLine !== '') {
        processedLines.push(currentLine);
      } else if (rawLine === '') {
        // Preserve empty lines from explicit newlines
        processedLines.push('');
      }
    } else {
      // No word wrap: truncate at character boundary
      let truncatedLine = '';
      for (const char of rawLine) {
        const testLine = truncatedLine + char;
        const testWidth = calculateLineWidth(testLine, fontSize, scale);
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

  // Calculate total text block height
  const calculateBlockHeight = (lineCount: number): number => {
    if (lineCount === 0) return 0;
    return lineCount * glyphHeight + (lineCount - 1) * lineSpacing;
  };

  // Determine how many lines fit
  let visibleLines = 0;
  for (let i = 1; i <= totalLines; i++) {
    if (calculateBlockHeight(i) <= rows) {
      visibleLines = i;
    } else {
      break;
    }
  }

  // Create grid
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

  // Calculate vertical starting position
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

  // Render each visible line
  const linesToRender = processedLines.slice(0, visibleLines);

  for (let lineIndex = 0; lineIndex < linesToRender.length; lineIndex++) {
    const line = linesToRender[lineIndex];
    const lineWidth = calculateLineWidth(line, fontSize, scale);

    // Calculate horizontal starting position
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

    // Calculate Y position for this line
    const lineY = startY + lineIndex * (glyphHeight + lineSpacing);

    // Render each character
    let currentX = startX;
    for (const char of line.toUpperCase()) {
      if (!isCharSupported(char)) continue;

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
