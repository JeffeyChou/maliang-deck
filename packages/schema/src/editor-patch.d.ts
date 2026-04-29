import type { Deck, TextElement } from './types.js';
import { type ValidationError } from './schema.js';
export type EditorSaveRequest = {
    baseRevision: string;
    ops: EditorOperation[];
};
export type EditorOperation = ReorderSlidesOperation | DeleteSlideOperation | UpdateElementOperation | AddElementOperation | DeleteElementOperation | DuplicateElementOperation;
export type ReorderSlidesOperation = {
    op: 'reorderSlides';
    slideIds: string[];
};
export type DeleteSlideOperation = {
    op: 'deleteSlide';
    slideId: string;
};
export type UpdateElementOperation = {
    op: 'updateElement';
    slideId: string;
    elementId: string;
    changes: EditorElementChanges;
};
export type AddElementOperation = {
    op: 'addElement';
    slideId: string;
    element: TextElement;
};
export type DeleteElementOperation = {
    op: 'deleteElement';
    slideId: string;
    elementId: string;
};
export type DuplicateElementOperation = {
    op: 'duplicateElement';
    slideId: string;
    elementId: string;
    newElementId: string;
};
export type EditorElementChanges = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    color?: string;
    align?: 'left' | 'center' | 'right';
    lineHeight?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
    x2?: number;
    y2?: number;
};
export type EditorPatchErrorCode = 'invalid-request' | 'invalid-operation' | 'invalid-slide-set' | 'cannot-delete-last-slide' | 'duplicate-element-id' | 'slide-not-found' | 'element-not-found' | 'unsupported-element' | 'unsupported-field' | 'unsupported-rotated-element' | 'invalid-value' | 'validation-failed';
export declare class EditorPatchError extends Error {
    readonly code: EditorPatchErrorCode;
    readonly path: Array<string | number>;
    readonly validationErrors?: ValidationError[];
    constructor(code: EditorPatchErrorCode, message: string, path?: Array<string | number>, validationErrors?: ValidationError[]);
}
export type ApplyEditorPatchResult = {
    deck: Deck;
    changed: boolean;
};
export declare function normalizeEditorSaveRequest(input: unknown): EditorSaveRequest;
export declare function applyEditorPatch(deck: Deck, request: Pick<EditorSaveRequest, 'ops'>): ApplyEditorPatchResult;
export declare function isEditorPatchError(error: unknown): error is EditorPatchError;
export declare const EDITOR_SUPPORTED_OPS: readonly ["reorderSlides", "deleteSlide", "updateElement", "addElement", "deleteElement", "duplicateElement"];
export declare const EDITOR_SUPPORTED_ELEMENT_TYPES: readonly ["text", "animatedText", "rect", "circle", "ellipse", "line", "image", "path", "polygon", "formula"];
//# sourceMappingURL=editor-patch.d.ts.map