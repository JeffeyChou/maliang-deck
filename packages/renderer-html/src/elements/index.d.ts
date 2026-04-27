import type { Element } from '@maliang-deck/schema';
export interface RenderElementContext {
    slideId?: string;
    autoAnimate?: boolean;
    depth?: number;
    /** Deck-level default font family for text elements that omit fontFamily. */
    defaultFont?: string;
}
/** Return the active context's defaultFont (used by text renderer). */
export declare function getActiveDefaultFont(): string | undefined;
export declare function childRenderContext(): RenderElementContext | undefined;
export declare function renderElement(el: Element, context?: RenderElementContext | number): string;
//# sourceMappingURL=index.d.ts.map