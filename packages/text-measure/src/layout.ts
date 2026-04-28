import type { TextBoxInput, TextBox, LayoutResult, LayoutWarning } from './types.js';
import type { FontRegistry } from './font-registry.js';
import { measureLine, measureLineHeight } from './fontkit-measurer.js';
import {
  estimateTextWidthHeuristic,
  estimateLineHeightHeuristic,
} from './heuristic-measurer.js';

// CJK codepoint check (same ranges as heuristic-measurer)
function isCjkCodepoint(cp: number): boolean {
  return (
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

function insertCjkBreakOpportunities(text: string): string {
  const chars = [...text];
  const result: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    result.push(chars[i]);
    const cp = chars[i].codePointAt(0) ?? 0;
    const nextCp = i + 1 < chars.length ? (chars[i + 1].codePointAt(0) ?? 0) : 0;
    if (isCjkCodepoint(cp) && i + 1 < chars.length && nextCp !== 0x200b) {
      result.push('\u200b');
    }
  }
  return result.join('');
}

function wrapLogicalLine(
  line: string,
  maxWidth: number,
  measureFn: (text: string) => number,
): string[] {
  if (!line) return [''];

  const processed = insertCjkBreakOpportunities(line);
  const tokens = processed.split(/(\s+|\u200b)/u);
  const displayLines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  for (const token of tokens) {
    if (token === '\u200b' || token === '') continue;
    const isWhitespace = /^\s+$/.test(token);
    const tokenWidth = measureFn(token);

    if (currentLine === '') {
      if (!isWhitespace) {
        currentLine = token;
        currentWidth = tokenWidth;
      }
      continue;
    }

    const candidateWidth = currentWidth + tokenWidth;
    if (candidateWidth <= maxWidth) {
      currentLine += token;
      currentWidth = candidateWidth;
    } else {
      if (isWhitespace) {
        displayLines.push(currentLine);
        currentLine = '';
        currentWidth = 0;
      } else {
        if (tokenWidth > maxWidth * 1.3) {
          displayLines.push(currentLine);
          currentLine = '';
          currentWidth = 0;
          const tokenChars = [...token];
          for (const ch of tokenChars) {
            const chWidth = measureFn(ch);
            if (currentLine === '') {
              currentLine = ch;
              currentWidth = chWidth;
            } else if (currentWidth + chWidth <= maxWidth) {
              currentLine += ch;
              currentWidth += chWidth;
            } else {
              displayLines.push(currentLine);
              currentLine = ch;
              currentWidth = chWidth;
            }
          }
        } else {
          displayLines.push(currentLine);
          currentLine = token;
          currentWidth = tokenWidth;
        }
      }
    }
  }

  if (currentLine !== '') {
    displayLines.push(currentLine);
  }

  return displayLines.length > 0 ? displayLines : [''];
}

/**
 * Lay out text content into wrapped lines within the given box dimensions.
 * Uses fontkit for precise measurement when a font is available, otherwise
 * falls back to the improved heuristic measurer.
 */
export function layoutTextBox(
  input: TextBoxInput,
  box: TextBox,
  registry: FontRegistry,
): LayoutResult {
  const warnings: LayoutWarning[] = [];
  const isBold = input.fontWeight === 'bold';
  const resolved = registry.resolve(input.fontFamily, isBold);
  const measurementSource: 'fontkit' | 'heuristic' =
    resolved.font !== null ? 'fontkit' : 'heuristic';

  if (resolved.source === 'heuristic') {
    warnings.push({
      type: 'font-fallback',
      message: `Font "${input.fontFamily}" not found; falling back to heuristic measurement`,
    });
  }

  const measureFn =
    resolved.font !== null
      ? (text: string) => measureLine(text, resolved.font, input.fontSize)
      : (text: string) =>
          estimateTextWidthHeuristic(text, input.fontSize, input.fontFamily, input.fontWeight);

  const lineHeight =
    resolved.font !== null
      ? measureLineHeight(resolved.font, input.fontSize, input.lineHeight)
      : estimateLineHeightHeuristic(input.fontSize, input.lineHeight);

  const logicalLines = input.content.split('\n');
  const allDisplayLines: string[] = [];
  for (const logicalLine of logicalLines) {
    const wrapped = wrapLogicalLine(logicalLine, box.width, measureFn);
    allDisplayLines.push(...wrapped);
  }

  const lineWidths = allDisplayLines.map((ln) => (ln ? measureFn(ln) : 0));
  const totalHeight = allDisplayLines.length * lineHeight;

  let overflow = false;
  let overflowAmount = 0;
  if (box.height !== undefined && totalHeight > box.height) {
    overflow = true;
    overflowAmount = totalHeight - box.height;
    warnings.push({
      type: 'overflow',
      message: `Text overflows box by ${overflowAmount.toFixed(1)}px (totalHeight=${totalHeight.toFixed(1)}, boxHeight=${box.height})`,
    });
  }

  return {
    lines: allDisplayLines,
    lineWidths,
    totalHeight,
    overflow,
    overflowAmount,
    measurementSource,
    warnings,
  };
}
