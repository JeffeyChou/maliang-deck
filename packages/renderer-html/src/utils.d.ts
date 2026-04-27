import type { BaseElement } from '@maliang-deck/schema';
/**
 * Build CSS transform string for rotation.
 * Returns empty string if no rotation is set.
 */
export declare function buildCssTransform(el: BaseElement): string;
/**
 * Build animation data attributes string for an element.
 * Returns empty string if no animation is set.
 */
export declare function buildAnimAttrs(el: BaseElement): string;
/**
 * Build initial hidden style for animated elements.
 * Step 0: opacity: 0 (will animate in)
 * Step >= 1: visibility: hidden; opacity: 0 (will reveal on click)
 */
export declare function buildAnimInitialStyle(el: BaseElement): string;
/**
 * Build inline style string for positioned absolute element.
 * Applies rotation and opacity when present.
 */
export declare function buildBaseStyle(el: BaseElement, extras?: string[]): string;
/**
 * Escape HTML special characters to prevent XSS / broken markup.
 */
export declare function escapeHtml(str: string): string;
/**
 * Escape JSON for embedding in a <script type="application/json"> block.
 * Prevents HTML parser from prematurely closing the script tag.
 */
export declare function escapeJsonForScript(json: string): string;
//# sourceMappingURL=utils.d.ts.map