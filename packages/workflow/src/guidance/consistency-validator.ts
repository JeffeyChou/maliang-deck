import type { Deck } from '@maliang-deck/schema';
import type { ConsistencyCheckResult, DeckDesign } from './types.js';

const TITLE_Y_TOLERANCE = 5;

/**
 * Validate cross-slide consistency of an assembled deck.
 *
 * Checks title element Y-position, margins, palette usage, and repeated
 * element positions. Returns an array of results; failures are warnings only
 * (assembly is never blocked in v1).
 */
export function validateConsistency(deck: Deck, deckDesign?: DeckDesign): ConsistencyCheckResult[] {
  const results: ConsistencyCheckResult[] = [];

  // --- Canvas size matches deckDesign ---
  if (deckDesign) {
    const expectedW = deckDesign.canvas.width;
    const expectedH = deckDesign.canvas.height;
    const actualW = deck.meta.canvas.width;
    const actualH = deck.meta.canvas.height;
    results.push({
      dimension: 'canvas.width',
      expected: expectedW,
      actual: actualW,
      pass: actualW === expectedW,
    });
    results.push({
      dimension: 'canvas.height',
      expected: expectedH,
      actual: actualH,
      pass: actualH === expectedH,
    });
  }

  // --- Title element Y-position consistent across slides ---
  const titleYPositions: Array<{ slideId: string; y: number }> = [];
  for (const slide of deck.slides) {
    for (const el of slide.elements) {
      if (el.type === 'text' && 'role' in el && (el as { role?: string }).role === 'title') {
        titleYPositions.push({ slideId: slide.id, y: el.y });
        break;
      }
      // Fallback: first text element on slide is likely the title
      if (el.type === 'text' && titleYPositions.findIndex((p) => p.slideId === slide.id) === -1) {
        titleYPositions.push({ slideId: slide.id, y: el.y });
        break;
      }
    }
  }

  if (titleYPositions.length > 1) {
    const referenceY = titleYPositions[0]!.y;
    for (const { slideId, y } of titleYPositions) {
      const pass = Math.abs(y - referenceY) <= TITLE_Y_TOLERANCE;
      results.push({
        dimension: 'title-band-y',
        expected: referenceY,
        actual: y,
        pass,
        slideId,
      });
    }
  }

  // --- Margins respect locked tokens ---
  if (deckDesign?.lockedTokens) {
    const { margins } = deckDesign.lockedTokens;
    const canvasW = deck.meta.canvas.width;
    const canvasH = deck.meta.canvas.height;

    for (const slide of deck.slides) {
      for (const el of slide.elements) {
        if (el.x < margins.left - TITLE_Y_TOLERANCE) {
          results.push({
            dimension: 'margin-left',
            expected: margins.left,
            actual: el.x,
            pass: false,
            slideId: slide.id,
          });
        }
        if (el.y < margins.top - TITLE_Y_TOLERANCE) {
          results.push({
            dimension: 'margin-top',
            expected: margins.top,
            actual: el.y,
            pass: false,
            slideId: slide.id,
          });
        }
        const elRight = el.x + (el.width ?? 0);
        if (elRight > canvasW - margins.right + TITLE_Y_TOLERANCE) {
          results.push({
            dimension: 'margin-right',
            expected: canvasW - margins.right,
            actual: elRight,
            pass: false,
            slideId: slide.id,
          });
        }
        const elBottom = el.y + (el.height ?? 0);
        if (elBottom > canvasH - margins.bottom + TITLE_Y_TOLERANCE) {
          results.push({
            dimension: 'margin-bottom',
            expected: canvasH - margins.bottom,
            actual: elBottom,
            pass: false,
            slideId: slide.id,
          });
        }
      }
    }
  }

  // --- Color palette usage ---
  if (deckDesign) {
    // Collect all declared palette colors from the style token set if available.
    // In v1 we check background colors on slides (a simple proxy for palette compliance).
    // Full element-level color checking requires richer DSL color fields.
    const declaredBackgrounds = new Set<string | undefined>();
    for (const slide of deck.slides) {
      declaredBackgrounds.add(slide.background);
    }
    // All slides should use the same background (or none) for visual consistency
    if (declaredBackgrounds.size > 1) {
      results.push({
        dimension: 'slide-background-consistency',
        expected: 'uniform background across slides',
        actual: `${declaredBackgrounds.size} distinct backgrounds`,
        pass: false,
      });
    }
  }

  // --- Repeated element type positions aligned across slides ---
  // Check that elements with the same id prefix appear at consistent X positions
  const elementXByPrefix = new Map<string, { slideId: string; x: number }>();
  for (const slide of deck.slides) {
    for (const el of slide.elements) {
      const prefix = el.id.replace(/-\d+$/, '');
      const existing = elementXByPrefix.get(prefix);
      if (!existing) {
        elementXByPrefix.set(prefix, { slideId: slide.id, x: el.x });
      } else {
        const pass = Math.abs(el.x - existing.x) <= TITLE_Y_TOLERANCE;
        if (!pass) {
          results.push({
            dimension: `repeated-element-x:${prefix}`,
            expected: existing.x,
            actual: el.x,
            pass: false,
            slideId: slide.id,
          });
        }
      }
    }
  }

  return results;
}
