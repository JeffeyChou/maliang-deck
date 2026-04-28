// Per-font-family calibrated average character width factors (as fraction of fontSize)
const FONT_CALIBRATION: Record<string, number> = {
  inter: 0.56,
  arial: 0.57,
  helvetica: 0.57,
  'helvetica neue': 0.56,
  'times new roman': 0.52,
  georgia: 0.54,
};

// CJK unicode ranges - characters that are full-width
function isCjk(cp: number): boolean {
  return (
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

export function estimateTextWidthHeuristic(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: 'normal' | 'bold',
): number {
  const lowerFamily = fontFamily.toLowerCase().split(',')[0].trim();
  const isMono = /mono|code|consolas|menlo|courier|jetbrains/i.test(lowerFamily);

  // Resolve base family factor from calibration table or defaults
  let baseFactor: number;
  if (isMono) {
    baseFactor = 0.62;
  } else {
    baseFactor = FONT_CALIBRATION[lowerFamily] ?? 0.56;
  }

  const weightFactor = /bold|[6-9]00/.test(fontWeight) ? 1.08 : 1;

  let units = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (/\s/u.test(char)) {
      units += 0.33;
    } else if (isCjk(cp)) {
      // CJK characters are full-width (approximately equal to fontSize)
      units += 1.0;
    } else if (/[il.,:;|!\u2019\u2018\u0060']/u.test(char)) {
      // Narrow characters: lowercase i, l, punctuation
      units += 0.28;
    } else if (/[fjrt]/u.test(char)) {
      // Narrow lowercase letters
      units += 0.38;
    } else if (/[aceghnopqsuvxyz]/u.test(char)) {
      // Standard lowercase letters
      units += baseFactor;
    } else if (/[bdk]/u.test(char)) {
      // Slightly wider lowercase
      units += baseFactor + 0.02;
    } else if (/[A-Z]/u.test(char)) {
      // Uppercase letters - slightly wider than lowercase
      units += baseFactor + 0.08;
    } else if (/[mwMW@#%&]/u.test(char)) {
      // Very wide characters
      units += 0.9;
    } else if (/[0-9]/u.test(char)) {
      // Digits are typically uniform width (tabular figures)
      units += 0.56;
    } else if (/[()<>{}[\]]/u.test(char)) {
      // Brackets
      units += 0.35;
    } else if (/[-+=/\\*^~_]/u.test(char)) {
      // Operators and symbols
      units += 0.5;
    } else {
      units += baseFactor;
    }
  }

  // Apply 1.02 safety factor to avoid underestimation
  return units * fontSize * weightFactor * 1.02;
}

export function estimateLineHeightHeuristic(fontSize: number, lineHeightFactor: number): number {
  return fontSize * lineHeightFactor;
}
