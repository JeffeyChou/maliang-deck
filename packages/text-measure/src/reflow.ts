import type { Deck, Slide, Element, TextElement } from '@maliang-deck/schema';
import type { TextBoxInput, LayoutWarning } from './types.js';
import type { FontRegistry } from './font-registry.js';
import { layoutTextBox } from './layout.js';

// ─── Public types ───────────────────────────────────────────────────────────

export interface ReflowOptions {
  columnTolerance?: number;    // px, default 20
  minGap?: number;             // px, default 8
  canvasWidth?: number;        // px, for spanning element detection
  spanningWidthRatio?: number; // default 0.6
  /** Deck-level default font family for text elements that omit fontFamily. */
  defaultFont?: string;
}

export interface Adjustment {
  elementId: string;
  oldY: number;
  newY: number;
  measuredHeight: number;
  delta: number;
}

export interface ReflowResult {
  slide: Slide;
  adjustments: Adjustment[];
  warnings: string[];
}

export interface ReflowReport {
  adjustments: Adjustment[];
  warnings: string[];
  slidesModified: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a TextElement (with optional fields) to a TextBoxInput (all required).
 * Uses the same defaults as the SVG renderer to ensure measurement consistency.
 */
export function toTextBoxInput(el: TextElement, defaultFont?: string): TextBoxInput {
  return {
    content: el.content,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily ?? defaultFont ?? 'sans-serif',
    fontWeight: el.fontWeight ?? 'normal',
    fontStyle: el.fontStyle ?? 'normal',
    lineHeight: el.lineHeight ?? 1.2,
  };
}

function isTextElement(el: Element): el is TextElement {
  return el.type === 'text';
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Core algorithm ─────────────────────────────────────────────────────────

/**
 * Reflow text elements on a single slide to eliminate vertical overlaps.
 *
 * Algorithm:
 * 1. Separate text elements into column-local vs spanning (by width ratio)
 * 2. Group column elements by X-position proximity
 * 3. Within each column, sort by Y and shift overlapping elements down
 * 4. Non-text elements are never moved
 */
export function reflowSlide(
  slide: Slide,
  registry: FontRegistry,
  options?: ReflowOptions,
): ReflowResult {
  const tolerance = options?.columnTolerance ?? 20;
  const minGap = options?.minGap ?? 8;
  const canvasW = options?.canvasWidth ?? 1280;
  const spanRatio = options?.spanningWidthRatio ?? 0.6;
  const spanThreshold = canvasW * spanRatio;

  const cloned = deepClone(slide);
  const adjustments: Adjustment[] = [];
  const warnings: string[] = [];

  // Extract text elements (preserve index for mutation)
  const textEntries: { el: TextElement; idx: number }[] = [];
  for (let i = 0; i < cloned.elements.length; i++) {
    const el = cloned.elements[i];
    if (isTextElement(el)) {
      textEntries.push({ el, idx: i });
    }
  }

  if (textEntries.length === 0) return { slide: cloned, adjustments, warnings };

  // Separate spanning vs column elements
  const columnEntries = textEntries.filter((e) => e.el.width <= spanThreshold);
  // Spanning elements are left untouched

  // Group column elements by X proximity
  const columns: { el: TextElement; idx: number }[][] = [];

  for (const entry of columnEntries) {
    let placed = false;
    for (const col of columns) {
      const refX = col[0].el.x;
      if (Math.abs(entry.el.x - refX) <= tolerance) {
        col.push(entry);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([entry]);
    }
  }

  // Process each column
  for (const col of columns) {
    // Sort by Y ascending
    col.sort((a, b) => a.el.y - b.el.y);

    let cascadeDelta = 0;

    for (let i = 0; i < col.length; i++) {
      const entry = col[i];
      const el = entry.el;

      // Apply accumulated cascade delta
      if (cascadeDelta > 0) {
        const oldY = el.y;
        el.y += cascadeDelta;
        adjustments.push({
          elementId: el.id,
          oldY,
          newY: el.y,
          measuredHeight: el.height ?? 0,
          delta: cascadeDelta,
        });
      }

      // Measure wrapped height
      const input = toTextBoxInput(el, options?.defaultFont);
      const layout = layoutTextBox(input, { width: el.width }, registry);
      const measuredHeight = layout.totalHeight;
      el.height = measuredHeight;

      // Check overlap with next element
      if (i + 1 < col.length) {
        const nextEl = col[i + 1].el;
        const bottom = el.y + measuredHeight;
        const nextTop = nextEl.y + cascadeDelta; // next element may also have cascade pending

        if (bottom + minGap > nextTop) {
          const additionalShift = bottom + minGap - nextTop;
          cascadeDelta += additionalShift;
        }
      }

      // Warn if element extends past canvas
      if (el.y + measuredHeight > (options?.canvasWidth ? canvasW * (720 / 1280) : 720)) {
        warnings.push(`Element "${el.id}" extends past slide bottom (y=${el.y.toFixed(0)}, h=${measuredHeight.toFixed(0)})`);
      }
    }
  }

  return { slide: cloned, adjustments, warnings };
}

/**
 * Reflow all slides in a deck.
 */
export function reflowDeck(
  deck: Deck,
  registry: FontRegistry,
  options?: ReflowOptions,
): { deck: Deck; report: ReflowReport } {
  const cloned = deepClone(deck);
  const allAdjustments: Adjustment[] = [];
  const allWarnings: string[] = [];
  let slidesModified = 0;

  const opts: ReflowOptions = {
    ...options,
    canvasWidth: cloned.meta.canvas.width,
    defaultFont: options?.defaultFont ?? cloned.meta.defaultFont,
  };

  for (let i = 0; i < cloned.slides.length; i++) {
    const result = reflowSlide(cloned.slides[i], registry, opts);
    cloned.slides[i] = result.slide;
    if (result.adjustments.length > 0) slidesModified++;
    allAdjustments.push(...result.adjustments);
    allWarnings.push(...result.warnings);
  }

  return {
    deck: cloned,
    report: { adjustments: allAdjustments, warnings: allWarnings, slidesModified },
  };
}
