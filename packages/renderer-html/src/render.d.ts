import type { Deck } from '@maliang-deck/schema';
export type HtmlExportMode = 'editable' | 'readonly';
export type RenderHtmlOptions = {
    /** Base path for assets. Default '/' (absolute, for serve mode). Use './' for static export. */
    assetBase?: string;
    /** Export mode. When set, adds data-mode to <html> and adjusts behavior. */
    mode?: HtmlExportMode;
};
/**
 * Render a complete DSL Deck to a standalone HTML document string.
 *
 * @param options.assetBase  Path prefix for runtime/assets references. Default '/'.
 * @param options.mode       'editable' | 'readonly' — sets data-mode on <html> for export.
 */
export declare function renderDeckToHtml(deck: Deck, options?: RenderHtmlOptions): string;
//# sourceMappingURL=render.d.ts.map