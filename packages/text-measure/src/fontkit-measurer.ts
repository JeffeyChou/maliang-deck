/**
 * Measure the rendered width of a text string using fontkit OpenType layout.
 * @param text - The string to measure
 * @param font - A fontkit font object (any because fontkit has no TS types)
 * @param fontSize - Font size in pixels
 * @returns Width in pixels
 */
export function measureLine(text: string, font: any, fontSize: number): number {
  const run = font.layout(text);
  const rawWidth = run.positions.reduce((sum: number, pos: any) => sum + pos.xAdvance, 0);
  return rawWidth * (fontSize / font.unitsPerEm);
}

/**
 * Compute the natural line height for a font at a given size.
 * @param font - A fontkit font object
 * @param fontSize - Font size in pixels
 * @param lineHeightFactor - Multiplier applied on top of the natural height
 * @returns Line height in pixels
 */
export function measureLineHeight(font: any, fontSize: number, lineHeightFactor: number): number {
  const naturalHeight =
    (font.ascent -
      font.descent +
      font.lineGap) *
    (fontSize / font.unitsPerEm);
  return naturalHeight * lineHeightFactor;
}
