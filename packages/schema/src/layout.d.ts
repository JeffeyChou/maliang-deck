import type { Element, LayoutElement, MaliangDeckDiagnostic } from './types.js';
export type ElementBox = {
    x: number;
    y: number;
    width?: number;
    height?: number;
};
export interface ResolvedElementRecord {
    element: Element;
    sourceElementId: string;
    sourcePath: string;
    box: ElementBox;
    diagnostics: MaliangDeckDiagnostic[];
}
export interface LayoutResolveContext {
    slideIndex?: number;
    originX: number;
    originY: number;
    path: string;
}
export declare function cloneElementWithBox(element: Element, box: ElementBox): Element;
export declare function resolveLayoutElement(layout: LayoutElement, context: LayoutResolveContext): ResolvedElementRecord[];
export declare function resolveLayoutChildren(layout: LayoutElement, context: LayoutResolveContext): Element[];
//# sourceMappingURL=layout.d.ts.map