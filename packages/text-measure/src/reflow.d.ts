import type { Deck, Slide, TextElement } from '@maliang-deck/schema';
import type { TextBoxInput } from './types.js';
import type { FontRegistry } from './font-registry.js';
export interface ReflowOptions {
    columnTolerance?: number;
    minGap?: number;
    canvasWidth?: number;
    spanningWidthRatio?: number;
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
/**
 * Convert a TextElement (with optional fields) to a TextBoxInput (all required).
 * Uses the same defaults as the SVG renderer to ensure measurement consistency.
 */
export declare function toTextBoxInput(el: TextElement): TextBoxInput;
/**
 * Reflow text elements on a single slide to eliminate vertical overlaps.
 *
 * Algorithm:
 * 1. Separate text elements into column-local vs spanning (by width ratio)
 * 2. Group column elements by X-position proximity
 * 3. Within each column, sort by Y and shift overlapping elements down
 * 4. Non-text elements are never moved
 */
export declare function reflowSlide(slide: Slide, registry: FontRegistry, options?: ReflowOptions): ReflowResult;
/**
 * Reflow all slides in a deck.
 */
export declare function reflowDeck(deck: Deck, registry: FontRegistry, options?: ReflowOptions): {
    deck: Deck;
    report: ReflowReport;
};
//# sourceMappingURL=reflow.d.ts.map