/**
 * DSL lint rules for the agent guidance system.
 *
 * These rules lint already-valid DSL for style conformance — they are NOT a
 * second schema. @maliang-deck/schema remains the sole source of truth for legal
 * DSL shape. This module intentionally does NOT import @maliang-deck/text-measure
 * because the workflow package does not depend on it (see CLAUDE.md boundaries).
 * Text overflow is detected via heuristic only.
 */
import type { Deck, Slide, Element } from '@maliang-deck/schema';
import { estimateFormulaHeight } from '@maliang-deck/schema';
import type { StyleDefinition, LintResult } from './types.js';

// ---------------------------------------------------------------------------
// Lint rule interface
// ---------------------------------------------------------------------------

export interface LintRule {
  id: string;
  name: string;
  severity: 'error' | 'warning';
  /** Run against a single slide. Returns zero or more lint results. */
  check: (slide: Slide, style: StyleDefinition, deck: Deck, context: LintContext) => LintResult[];
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  source?: 'declared' | 'estimated' | 'rendered';
}

export interface LintContext {
  elementBounds?: (slide: Slide, element: Element, deck: Deck) => ElementBounds | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a CSS hex color string to RGB components, or return null. */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.replace(/^#/, '');
  if (hex.length === 3) {
    const r = parseInt(hex[0]! + hex[0]!, 16);
    const g = parseInt(hex[1]! + hex[1]!, 16);
    const b = parseInt(hex[2]! + hex[2]!, 16);
    return [r, g, b];
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

/** Euclidean distance in RGB space between two hex colors. */
function colorDistance(a: string, b: string): number {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return Infinity;
  return Math.sqrt(
    (pa[0] - pb[0]) ** 2 +
    (pa[1] - pb[1]) ** 2 +
    (pa[2] - pb[2]) ** 2,
  );
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number | undefined {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  if (!c1 || !c2) return undefined;
  const l1 = relativeLuminance(c1[0], c1[1], c1[2]);
  const l2 = relativeLuminance(c2[0], c2[1], c2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Return all declared palette colors for a style. */
function paletteColors(style: StyleDefinition): string[] {
  const { palette } = style.tokens;
  const colors: string[] = [
    palette.primary,
    palette.secondary,
    palette.accent,
    palette.neutral,
  ];
  if (palette.semantic) colors.push(...Object.values(palette.semantic));
  return colors;
}

/** Threshold: max RGB Euclidean distance to consider a color "in palette". */
const PALETTE_DISTANCE_THRESHOLD = 30;

function isInPalette(color: string, style: StyleDefinition): boolean {
  // Allow white, black, transparent-like values without requiring palette match.
  const lower = color.toLowerCase();
  if (['white', '#fff', '#ffffff', 'black', '#000', '#000000', 'transparent', 'none', ''].includes(lower)) {
    return true;
  }
  return paletteColors(style).some((p) => colorDistance(color, p) <= PALETTE_DISTANCE_THRESHOLD);
}

/** Collect color strings from an element (fill, stroke, color). */
function elementColors(el: Element): string[] {
  const colors: string[] = [];
  if ('color' in el && typeof el.color === 'string') colors.push(el.color);
  if ('fill' in el && typeof el.fill === 'string') colors.push(el.fill);
  if ('stroke' in el && typeof el.stroke === 'string') colors.push(el.stroke);
  return colors.filter(Boolean);
}

/** Flatten group elements recursively. */
function flattenElements(elements: Element[]): Element[] {
  const result: Element[] = [];
  for (const el of elements) {
    result.push(el);
    if (el.type === 'group') {
      result.push(...flattenElements(el.elements));
    }
  }
  return result;
}

function fallbackElementBounds(el: Element): ElementBounds {
  if (el.type === 'circle') {
    return {
      x: el.x - el.radius,
      y: el.y - el.radius,
      width: el.radius * 2,
      height: el.radius * 2,
      source: 'declared',
    };
  }

  if (el.type === 'line') {
    return {
      x: Math.min(el.x, el.x2),
      y: Math.min(el.y, el.y2),
      width: Math.abs(el.x2 - el.x),
      height: Math.abs(el.y2 - el.y),
      source: 'declared',
    };
  }

  if (el.type === 'formula') {
    const declaredH = el.height ?? 0;
    const estimatedH = estimateFormulaHeight(el);
    return {
      x: el.x,
      y: el.y,
      width: el.width,
      height: Math.max(declaredH, estimatedH),
      source: declaredH >= estimatedH ? 'declared' : 'estimated',
    };
  }

  const sized = el as Element & { width?: number; height?: number; fontSize?: number; lineHeight?: number };
  return {
    x: el.x,
    y: el.y,
    width: sized.width ?? 0,
    height: sized.height ?? (sized.fontSize != null ? sized.fontSize * (sized.lineHeight ?? 1.2) : 0),
    source: 'declared',
  };
}

function elementBounds(slide: Slide, el: Element, deck: Deck, context: LintContext): ElementBounds {
  return context.elementBounds?.(slide, el, deck) ?? fallbackElementBounds(el);
}

function boxesOverlap(a: ElementBounds, b: ElementBounds): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

const DEFAULT_LINT_CONTEXT: LintContext = {};

const MIN_SPEAKER_NOTE_SENTENCES = 4;

function speakerNoteUnits(notes: string): { units: string[]; numbered: boolean } {
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const numberedLines = lines.filter((line) => /^\d+[.)]\s+\S/.test(line));
  if (numberedLines.length > 0) {
    return {
      numbered: true,
      units: numberedLines.map((line) => line.replace(/^\d+[.)]\s+/, '').trim()),
    };
  }

  const sentences = notes.match(/[^.!?\n]+[.!?](?=\s|$)/g) ?? [];
  return { numbered: false, units: sentences.map((sentence) => sentence.trim()) };
}

// ---------------------------------------------------------------------------
// Built-in lint rules
// ---------------------------------------------------------------------------

/**
 * Rule: palette-conformance
 * Element fill/stroke/color values should be within the declared style palette.
 * Severity: warning (palette drift is not a hard error).
 */
const paletteConformanceRule: LintRule = {
  id: 'palette-conformance',
  name: 'Palette Conformance',
  severity: 'warning',
  check(slide, style) {
    const results: LintResult[] = [];
    for (const el of flattenElements(slide.elements)) {
      for (const color of elementColors(el)) {
        if (!isInPalette(color, style)) {
          results.push({
            ruleId: 'palette-conformance',
            severity: 'warning',
            message: `Element "${el.id}" uses color "${color}" which is outside the style palette.`,
            slideId: slide.id,
            elementId: el.id,
          });
        }
      }
    }
    return results;
  },
};

/**
 * Rule: canvas-bounds
 * No element should extend beyond the canvas dimensions.
 * Severity: error (off-canvas elements are clipped or invisible in export).
 */
const canvasBoundsRule: LintRule = {
  id: 'canvas-bounds',
  name: 'Canvas Bounds',
  severity: 'error',
  check(slide, _style, deck) {
    const { width: cw, height: ch } = deck.meta.canvas;
    const results: LintResult[] = [];

    for (const el of flattenElements(slide.elements)) {
      let left: number;
      let top: number;
      let w: number;
      let h: number;

      if (el.type === 'circle') {
        // Circle x/y is the center, not the top-left corner
        const r = el.radius ?? 0;
        left = el.x - r;
        top = el.y - r;
        w = r * 2;
        h = r * 2;
      } else {
        left = el.x ?? 0;
        top = el.y ?? 0;
        w = el.width ?? 0;
        h = el.height ?? 0;
      }

      if (left < 0 || top < 0 || left + w > cw || top + h > ch) {
        results.push({
          ruleId: 'canvas-bounds',
          severity: 'error',
          message: `Element "${el.id}" extends outside canvas (left:${left} top:${top} w:${w} h:${h}, canvas:${cw}×${ch}).`,
          slideId: slide.id,
          elementId: el.id,
        });
      }
    }
    return results;
  },
};

/**
 * Rule: text-overflow
 * Heuristic check for text elements whose content may overflow the element box.
 * Uses character-count estimation at assumed 14px average character width.
 * Does NOT import @maliang-deck/text-measure — precise overflow detection belongs
 * in the renderer layer where text-measure is already available.
 * Severity: warning (heuristic only — false positives expected).
 */
const textOverflowRule: LintRule = {
  id: 'text-overflow',
  name: 'Text Overflow (Heuristic)',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];

    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'text') continue;
      const content = el.content ?? '';
      if (!content) continue;

      const fontSize = el.fontSize ?? 16;
      const lineHeight = el.lineHeight ?? 1.4;
      const elWidth = el.width ?? 0;
      const elHeight = el.height;

      if (elWidth <= 0 || !elHeight || elHeight <= 0) continue;

      // Estimate average character width as 0.55× font size (typical sans-serif)
      const avgCharWidth = fontSize * 0.55;
      const charsPerLine = Math.max(1, Math.floor(elWidth / avgCharWidth));
      const lineHeightPx = fontSize * lineHeight;
      const maxLines = Math.floor(elHeight / lineHeightPx);

      // Split on explicit newlines first, then estimate soft-wraps
      const hardLines = content.split('\n');
      let estimatedLines = 0;
      for (const line of hardLines) {
        estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      }

      if (estimatedLines > maxLines) {
        results.push({
          ruleId: 'text-overflow',
          severity: 'warning',
          message: `Element "${el.id}" may overflow: ~${estimatedLines} lines estimated, ${maxLines} lines fit (heuristic, verify in renderer).`,
          slideId: slide.id,
          elementId: el.id,
        });
      }
    }
    return results;
  },
};

/**
 * Rule: image-resolution
 * Image elements must have a non-empty src attribute.
 * Severity: error (broken image references cause export failures).
 */
const imageResolutionRule: LintRule = {
  id: 'image-resolution',
  name: 'Image Source Valid',
  severity: 'error',
  check(slide) {
    const results: LintResult[] = [];

    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'image') continue;
      if (!el.src || el.src.trim() === '') {
        results.push({
          ruleId: 'image-resolution',
          severity: 'error',
          message: `Image element "${el.id}" has an empty or missing src.`,
          slideId: slide.id,
          elementId: el.id,
        });
      }
    }
    return results;
  },
};

/**
 * Rule: speaker-notes-detail
 * Speaker notes should be deliverable presenter scripts, not vague slide summaries.
 * Severity: warning (notes are workflow guidance, not core DSL schema).
 */
const speakerNotesDetailRule: LintRule = {
  id: 'speaker-notes-detail',
  name: 'Speaker Notes Detail',
  severity: 'warning',
  check(slide) {
    const notes = slide.notes?.trim();
    if (!notes) {
      return [{
        ruleId: 'speaker-notes-detail',
        severity: 'warning',
        message: `Slide "${slide.id}" is missing speaker notes. Add sentence-by-sentence presenter notes, not a slide summary.`,
        slideId: slide.id,
      }];
    }

    const { units, numbered } = speakerNoteUnits(notes);
    const results: LintResult[] = [];
    if (units.length < MIN_SPEAKER_NOTE_SENTENCES) {
      results.push({
        ruleId: 'speaker-notes-detail',
        severity: 'warning',
        message: `Slide "${slide.id}" has ${units.length} speaker-note sentence(s); expected at least ${MIN_SPEAKER_NOTE_SENTENCES} presenter beats.`,
        slideId: slide.id,
      });
    }

    if (!numbered) {
      results.push({
        ruleId: 'speaker-notes-detail',
        severity: 'warning',
        message: `Slide "${slide.id}" speaker notes are not formatted as numbered sentence-by-sentence presenter beats.`,
        slideId: slide.id,
      });
    }

    const nonSentenceUnits = units.filter((unit) => !/[.!?]$/.test(unit));
    if (nonSentenceUnits.length > 0) {
      results.push({
        ruleId: 'speaker-notes-detail',
        severity: 'warning',
        message: `Slide "${slide.id}" has ${nonSentenceUnits.length} numbered speaker-note line(s) that do not end as complete sentences.`,
        slideId: slide.id,
      });
    }
    return results;
  },
};

/**
 * Rule: academic-citations
 * Evidence slides in the academic style must have a citation in speaker notes
 * or a label/text element whose content contains a citation marker.
 * Severity: warning (academic style only).
 */
const academicCitationsRule: LintRule = {
  id: 'academic-citations',
  name: 'Academic Citations on Evidence Slides',
  severity: 'warning',
  check(slide, style) {
    if (!style.qualityRules.some((r) => r.id === 'academic-citations')) return [];

    // Only check slides that look like evidence slides (have chart or image elements)
    const hasEvidence = flattenElements(slide.elements).some(
      (el) => el.type === 'chart' || el.type === 'image' || el.type === 'table',
    );
    if (!hasEvidence) return [];

    // Check speaker notes for citation markers: [1], (Author, 2024), doi:, etc.
    const citationPattern = /(\[\d+\]|\([A-Z][a-z]+,\s*\d{4}\)|doi:|et al\.|ibid\.)/i;
    if (slide.notes && citationPattern.test(slide.notes)) return [];

    // Check for a text element that looks like a citation
    const hasCitationElement = flattenElements(slide.elements).some((el) => {
      if (el.type !== 'text') return false;
      return citationPattern.test(el.content ?? '');
    });
    if (hasCitationElement) return [];

    return [{
      ruleId: 'academic-citations',
      severity: 'warning',
      message: `Slide "${slide.id}" contains evidence elements but no citation found in notes or elements.`,
      slideId: slide.id,
    }];
  },
};

/**
 * Rule: consulting-assertion-titles
 * Title text elements in consulting style should be assertion-form sentences
 * (contain a verb, end with period or punctuation, not just a noun phrase).
 * Severity: warning (consulting style only).
 */
const consultingAssertionTitlesRule: LintRule = {
  id: 'consulting-assertion-titles',
  name: 'Consulting Assertion-Based Titles',
  severity: 'warning',
  check(slide, style) {
    if (!style.qualityRules.some((r) => r.id === 'consulting-assertion-titles')) return [];

    const results: LintResult[] = [];
    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'text') continue;
      if (el.textRole !== 'heading') continue;

      const content = (el.content ?? '').trim();
      if (!content) continue;

      // An assertion title should:
      // 1. Be a complete sentence (contain a common verb word or end with punctuation)
      // 2. Not be a short noun phrase (< 4 words typically indicates a topic label)
      const wordCount = content.split(/\s+/).length;
      const hasVerb = /\b(is|are|was|were|has|have|had|will|would|can|could|should|shows?|indicates?|reveals?|drives?|enables?|reduces?|increases?|improves?|grows?|falls?|rises?|drops?|delivers?|achieves?|exceeds?|reaches?|surpasses?)\b/i.test(content);
      const endsPunctuation = /[.!?]$/.test(content);

      if (wordCount < 4 || (!hasVerb && !endsPunctuation)) {
        results.push({
          ruleId: 'consulting-assertion-titles',
          severity: 'warning',
          message: `Heading element "${el.id}" appears to be a descriptive label, not an assertion: "${content.slice(0, 60)}${content.length > 60 ? '…' : ''}"`,
          slideId: slide.id,
          elementId: el.id,
        });
      }
    }
    return results;
  },
};

/**
 * Rule: density-check
 * Element count relative to canvas area should match the style's density preference.
 * Compares slide element count against per-density thresholds.
 * Severity: warning.
 */
const densityCheckRule: LintRule = {
  id: 'density-check',
  name: 'Slide Density Check',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];
    // Thresholds: high density = up to 20 elements, medium = up to 12, low = up to 6
    const allElements = flattenElements(slide.elements);
    const count = allElements.length;

    // Flag extremely crowded slides regardless of style — > 20 elements is universally dense
    if (count > 20) {
      results.push({
        ruleId: 'density-check',
        severity: 'warning',
        message: `Slide "${slide.id}" has ${count} elements — consider splitting into multiple slides for readability.`,
        slideId: slide.id,
      });
    }
    return results;
  },
};

const chartThemeCoherenceRule: LintRule = {
  id: 'chart-theme-coherence',
  name: 'Chart Theme Coherence',
  severity: 'warning',
  check(slide, style) {
    const results: LintResult[] = [];
    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'chart') continue;
      const chart = el as { style?: { palette?: string[] }; id: string };
      if (!chart.style?.palette) continue;
      for (const color of chart.style.palette) {
        if (!isInPalette(color, style)) {
          results.push({
            ruleId: 'chart-theme-coherence',
            severity: 'warning',
            message: `Chart "${el.id}" palette color "${color}" diverges from the style palette.`,
            slideId: slide.id,
            elementId: el.id,
          });
          break;
        }
      }
    }
    return results;
  },
};

const tableHeaderContrastRule: LintRule = {
  id: 'table-header-contrast',
  name: 'Table Header Contrast',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];
    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'table') continue;
      const table = el as { style?: { headerBackground?: string; headerColor?: string }; id: string };
      if (!table.style?.headerBackground || !table.style?.headerColor) continue;
      const ratio = contrastRatio(table.style.headerBackground, table.style.headerColor);
      if (ratio != null && ratio < 4.5) {
        results.push({
          ruleId: 'table-header-contrast',
          severity: 'warning',
          message: `Table "${el.id}" header contrast ratio ${ratio.toFixed(1)}:1 is below WCAG AA (4.5:1).`,
          slideId: slide.id,
          elementId: el.id,
        });
      }
    }
    return results;
  },
};

/**
 * Rule: animation-overuse
 * Slides with too many distinct animation effects or too many animated
 * elements risk feeling chaotic. Flags slides exceeding thresholds.
 * Severity: warning.
 */
const animationOveruseRule: LintRule = {
  id: 'animation-overuse',
  name: 'Animation Overuse',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];
    const allElements = flattenElements(slide.elements);
    const animatedEls = allElements.filter((el) => el.animation?.enter);
    const distinctEffects = new Set(animatedEls.map((el) => el.animation!.enter));

    if (distinctEffects.size > 4) {
      results.push({
        ruleId: 'animation-overuse',
        severity: 'warning',
        message: `Slide "${slide.id}" uses ${distinctEffects.size} distinct animation effects — limit to 3–4 for visual coherence.`,
        slideId: slide.id,
      });
    }

    if (animatedEls.length > 12) {
      results.push({
        ruleId: 'animation-overuse',
        severity: 'warning',
        message: `Slide "${slide.id}" has ${animatedEls.length} animated elements — consider reducing to avoid overwhelming the audience.`,
        slideId: slide.id,
      });
    }

    return results;
  },
};

const customHtmlUsageRule: LintRule = {
  id: 'customHtml-usage',
  name: 'Custom HTML Usage',
  severity: 'error',
  check(slide) {
    const results: LintResult[] = [];
    for (const el of flattenElements(slide.elements)) {
      if (el.type !== 'customHtml') continue;
      results.push({
        ruleId: 'customHtml-usage',
        severity: 'error',
        message: `Slide "${slide.id}" uses customHtml element "${el.id}" which requires manual review for export compatibility.`,
        slideId: slide.id,
        elementId: el.id,
      });
    }
    return results;
  },
};

/**
 * Rule: css-naming-convention
 * Advisory rule that suggests CSS naming convention suffixes for elements that
 * could benefit from automatic theme polish (e.g. the neon-glass-dark theme's
 * generic selectors).
 *
 * Checks:
 * - rect elements that look like glass cards (rgba white fill + stroke + radius >= 20)
 *   should have "-glass" in their ID.
 * - text elements that look like kickers (fontSize <= 15, fontWeight bold, ALL CAPS)
 *   should have "-kicker" in their ID.
 *
 * Severity: warning (advisory only — never blocks assembly).
 */
const cssNamingConventionRule: LintRule = {
  id: 'css-naming-convention',
  name: 'CSS Naming Convention for Theme Polish',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];

    for (const el of flattenElements(slide.elements)) {
      if (el.type === 'rect') {
        const fill = ('fill' in el && typeof el.fill === 'string') ? el.fill : '';
        const stroke = ('stroke' in el && typeof el.stroke === 'string') ? el.stroke : '';
        const radius = ('radius' in el && typeof el.radius === 'number') ? el.radius : 0;

        const looksLikeGlass =
          fill.includes('rgba(255,255,255') &&
          stroke.includes('rgba(255,255,255') &&
          radius >= 20;

        if (looksLikeGlass && !el.id.includes('glass')) {
          results.push({
            ruleId: 'css-naming-convention',
            severity: 'warning',
            message: `Rect element "${el.id}" looks like a glass card (rgba white fill+stroke, radius ${radius}) — consider adding "-glass" to the ID to activate automatic theme polish.`,
            slideId: slide.id,
            elementId: el.id,
          });
        }
      } else if (el.type === 'text') {
        const fontSize = el.fontSize ?? 16;
        const fontWeight = ('fontWeight' in el && typeof el.fontWeight === 'string') ? el.fontWeight : '';
        const content = el.content ?? '';

        const looksLikeKicker =
          fontSize <= 15 &&
          fontWeight === 'bold' &&
          content.length > 0 &&
          content === content.toUpperCase() &&
          /[A-Z]/.test(content);

        if (looksLikeKicker && !el.id.includes('kicker')) {
          results.push({
            ruleId: 'css-naming-convention',
            severity: 'warning',
            message: `Text element "${el.id}" looks like a kicker (fontSize ${fontSize}, bold, ALL CAPS) — consider adding "-kicker" to the ID to activate automatic theme polish.`,
            slideId: slide.id,
            elementId: el.id,
          });
        }
      }
    }

    return results;
  },
};

/**
 * Rule: formula-overlap
 * Detects formula elements that likely overlap other elements. Browser callers
 * can provide rendered bounds for KaTeX descendants; assembly falls back to the
 * schema-level formula height estimate.
 * Severity: warning (fallback estimates may have false positives).
 */
const formulaOverlapRule: LintRule = {
  id: 'formula-overlap',
  name: 'Formula Element Overlap',
  severity: 'warning',
  check(slide, _style, deck, context) {
    const results: LintResult[] = [];
    const elements = flattenElements(slide.elements);

    for (const el of elements) {
      if (el.type !== 'formula') continue;
      const declaredH = el.height ?? 0;
      const estimatedH = estimateFormulaHeight(el);
      const formulaBox = elementBounds(slide, el, deck, context);
      const hasRenderedBounds = formulaBox.source === 'rendered';
      if (!hasRenderedBounds && declaredH > 0 && estimatedH <= declaredH) continue;

      const fallbackBox = fallbackElementBounds(el);
      const declaredBox = { ...fallbackBox, height: declaredH || fallbackBox.height };

      // Find any element whose box intersects the formula overflow region.
      for (const other of elements) {
        if (other.id === el.id) continue;
        const otherBox = elementBounds(slide, other, deck, context);
        if (boxesOverlap(formulaBox, otherBox)) {
          // Preserve the old intent for fallback estimates: warn only about
          // overflow beyond the declared box, not deliberate content inside it.
          if (!hasRenderedBounds && declaredH > 0 && boxesOverlap(declaredBox, otherBox)) continue;
          results.push({
            ruleId: 'formula-overlap',
            severity: 'warning',
            message: hasRenderedBounds
              ? `Formula "${el.id}" (rendered KaTeX bounds ${Math.round(formulaBox.width)}x${Math.round(formulaBox.height)}px) overlaps "${other.id}".`
              : `Formula "${el.id}" (estimated height ${estimatedH}px, declared ${declaredH || 'none'}px) likely overlaps "${other.id}" at y=${otherBox.y}.`,
            slideId: slide.id,
            elementId: el.id,
          });
          break; // one warning per formula is enough
        }
      }
    }
    return results;
  },
};

/**
 * Rule: circle-text-centering
 * Detects text elements that appear to be labels inside circles (same
 * animation step, spatially overlapping, center-aligned) but whose visual
 * center does not align with the circle center.
 * Severity: warning.
 */
const circleTextCenteringRule: LintRule = {
  id: 'circle-text-centering',
  name: 'Circle–Text Label Centering',
  severity: 'warning',
  check(slide) {
    const results: LintResult[] = [];
    const elements = flattenElements(slide.elements);
    const circles = elements.filter((el) => el.type === 'circle');
    const texts = elements.filter((el) => el.type === 'text' && el.align === 'center');

    for (const circle of circles) {
      if (circle.type !== 'circle') continue;
      const cx = circle.x;
      const cy = circle.y;
      const r = circle.radius;
      const circleStep = circle.animation?.step;

      for (const text of texts) {
        if (text.type !== 'text') continue;
        // Only check texts that share the same animation step (likely a pair)
        const textStep = text.animation?.step;
        if (circleStep != null && textStep != null && circleStep !== textStep) continue;

        const textCenterX = text.x + text.width / 2;
        const textCenterY = text.y + (text.fontSize ?? 16) / 2;

        // Check if text is spatially inside the circle bounds
        const dx = Math.abs(textCenterX - cx);
        const dy = Math.abs(textCenterY - cy);
        if (dx > r || dy > r) continue;

        // The text is inside the circle — check centering accuracy
        const TOLERANCE = 4; // 4px tolerance
        if (Math.abs(textCenterX - cx) > TOLERANCE) {
          results.push({
            ruleId: 'circle-text-centering',
            severity: 'warning',
            message: `Text "${text.id}" visual center (x=${textCenterX}) is ${Math.round(textCenterX - cx)}px off from circle "${circle.id}" center (x=${cx}). Expected text.x=${Math.round(cx - text.width / 2)}.`,
            slideId: slide.id,
            elementId: text.id,
          });
        }
      }
    }
    return results;
  },
};

// ---------------------------------------------------------------------------
// Built-in rule set
// ---------------------------------------------------------------------------

export const builtInRules: LintRule[] = [
  paletteConformanceRule,
  canvasBoundsRule,
  textOverflowRule,
  imageResolutionRule,
  speakerNotesDetailRule,
  academicCitationsRule,
  consultingAssertionTitlesRule,
  densityCheckRule,
  chartThemeCoherenceRule,
  tableHeaderContrastRule,
  animationOveruseRule,
  customHtmlUsageRule,
  cssNamingConventionRule,
  formulaOverlapRule,
  circleTextCenteringRule,
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Run all applicable lint rules against a single slide.
 * Rules whose applicableStyles list is non-empty and doesn't include the
 * active style are skipped.
 */
export function lintSlide(
  slide: Slide,
  style: StyleDefinition,
  deck: Deck,
  rules: LintRule[] = builtInRules,
  context: LintContext = DEFAULT_LINT_CONTEXT,
): LintResult[] {
  const results: LintResult[] = [];
  for (const rule of rules) {
    // Check applicableStyles on the matching quality rule definition (if any)
    const qualityRule = style.qualityRules.find((qr) => qr.id === rule.id);
    if (qualityRule && qualityRule.applicableStyles.length > 0) {
      if (!qualityRule.applicableStyles.includes(style.id)) continue;
    }
    results.push(...rule.check(slide, style, deck, context));
  }
  return results;
}

/**
 * Run all lint rules against every slide in the deck.
 * Returns combined results sorted by slide order.
 */
export function lintDeck(
  deck: Deck,
  style: StyleDefinition,
  rules: LintRule[] = builtInRules,
  context: LintContext = DEFAULT_LINT_CONTEXT,
): LintResult[] {
  const results: LintResult[] = [];
  for (const slide of deck.slides) {
    results.push(...lintSlide(slide, style, deck, rules, context));
  }
  return results;
}
