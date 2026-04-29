import { validateDeck } from './schema.js';
export class EditorPatchError extends Error {
    code;
    path;
    validationErrors;
    constructor(code, message, path = [], validationErrors) {
        super(message);
        this.name = 'EditorPatchError';
        this.code = code;
        this.path = path;
        this.validationErrors = validationErrors;
    }
}
const TEXT_FIELDS = new Set([
    'x',
    'y',
    'width',
    'height',
    'content',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'fontStyle',
    'textDecoration',
    'color',
    'align',
    'lineHeight',
]);
const ANIMATED_TEXT_FIELDS = new Set([
    'x',
    'y',
    'width',
    'height',
    'content',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'color',
    'align',
    'lineHeight',
]);
const IMAGE_FIELDS = new Set(['x', 'y', 'width', 'height']);
const RECT_FIELDS = new Set(['x', 'y', 'width', 'height', 'fill', 'stroke', 'strokeWidth', 'radius']);
const LINE_FIELDS = new Set(['x', 'y', 'x2', 'y2', 'stroke', 'strokeWidth']);
const CIRCLE_FIELDS = new Set(['x', 'y', 'radius', 'fill', 'stroke', 'strokeWidth']);
const ELLIPSE_FIELDS = new Set(['x', 'y', 'width', 'height', 'fill', 'stroke', 'strokeWidth']);
const PATH_POLYGON_FIELDS = new Set(['x', 'y', 'width', 'height', 'fill', 'stroke', 'strokeWidth']);
const FORMULA_FIELDS = new Set(['x', 'y']);
const POSITIVE_NUMBER_FIELDS = new Set(['width', 'height', 'fontSize', 'lineHeight', 'radius']);
const NONNEGATIVE_NUMBER_FIELDS = new Set(['strokeWidth']);
const FINITE_NUMBER_FIELDS = new Set(['x', 'y', 'x2', 'y2', 'width', 'height', 'fontSize', 'lineHeight', 'strokeWidth', 'radius']);
const STRING_FIELDS = new Set(['content', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'color', 'align', 'fill', 'stroke']);
const CHANGE_FIELDS = new Set([
    'x',
    'y',
    'x2',
    'y2',
    'width',
    'height',
    'content',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'fontStyle',
    'textDecoration',
    'color',
    'align',
    'lineHeight',
    'fill',
    'stroke',
    'strokeWidth',
    'radius',
]);
const EDITOR_UPDATE_ELEMENT_TYPE_SET = new Set([
    'text',
    'animatedText',
    'rect',
    'circle',
    'ellipse',
    'line',
    'image',
    'path',
    'polygon',
    'formula',
]);
const EDITOR_STRUCTURAL_ELEMENT_TYPE_SET = new Set([
    'text',
    'animatedText',
    'rect',
    'circle',
    'ellipse',
    'line',
    'image',
    'path',
    'polygon',
]);
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function cloneDeck(deck) {
    return JSON.parse(JSON.stringify(deck));
}
function cloneElement(element) {
    return JSON.parse(JSON.stringify(element));
}
function assertString(value, path, field) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new EditorPatchError('invalid-operation', `${field} must be a non-empty string`, path);
    }
    return value;
}
function assertStringArray(value, path, field) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
        throw new EditorPatchError('invalid-operation', `${field} must be an array of non-empty strings`, path);
    }
    return value;
}
function ensureNoDuplicateTopLevelElementIds(slide, slideIndex) {
    const seen = new Set();
    slide.elements.forEach((element, elementIndex) => {
        if (seen.has(element.id)) {
            throw new EditorPatchError('duplicate-element-id', `Duplicate top-level element id "${element.id}" in slide "${slide.id}"`, ['slides', slideIndex, 'elements', elementIndex, 'id']);
        }
        seen.add(element.id);
    });
}
function findSlide(deck, slideId, opIndex) {
    const slideIndex = deck.slides.findIndex((slide) => slide.id === slideId);
    if (slideIndex < 0) {
        throw new EditorPatchError('slide-not-found', `Slide "${slideId}" was not found`, ['ops', opIndex, 'slideId']);
    }
    return { slide: deck.slides[slideIndex], slideIndex };
}
function findTopLevelElement(slide, slideIndex, elementId, opIndex) {
    ensureNoDuplicateTopLevelElementIds(slide, slideIndex);
    const elementIndex = slide.elements.findIndex((element) => element.id === elementId);
    if (elementIndex < 0) {
        throw new EditorPatchError('element-not-found', `Top-level element "${elementId}" was not found`, ['ops', opIndex, 'elementId']);
    }
    return { element: slide.elements[elementIndex], elementIndex };
}
function normalizeOperation(raw, opIndex) {
    if (!isRecord(raw)) {
        throw new EditorPatchError('invalid-operation', 'Operation must be an object', ['ops', opIndex]);
    }
    if (raw.op === 'reorderSlides') {
        return {
            op: 'reorderSlides',
            slideIds: assertStringArray(raw.slideIds, ['ops', opIndex, 'slideIds'], 'slideIds'),
        };
    }
    if (raw.op === 'deleteSlide') {
        return {
            op: 'deleteSlide',
            slideId: assertString(raw.slideId, ['ops', opIndex, 'slideId'], 'slideId'),
        };
    }
    if (raw.op === 'updateElement') {
        if (!isRecord(raw.changes)) {
            throw new EditorPatchError('invalid-operation', 'changes must be an object', ['ops', opIndex, 'changes']);
        }
        return {
            op: 'updateElement',
            slideId: assertString(raw.slideId, ['ops', opIndex, 'slideId'], 'slideId'),
            elementId: assertString(raw.elementId, ['ops', opIndex, 'elementId'], 'elementId'),
            changes: normalizeChanges(raw.changes, opIndex),
        };
    }
    if (raw.op === 'addElement') {
        if (!isRecord(raw.element)) {
            throw new EditorPatchError('invalid-operation', 'element must be an object', ['ops', opIndex, 'element']);
        }
        return {
            op: 'addElement',
            slideId: assertString(raw.slideId, ['ops', opIndex, 'slideId'], 'slideId'),
            element: normalizeAddElement(raw.element, opIndex),
        };
    }
    if (raw.op === 'deleteElement') {
        return {
            op: 'deleteElement',
            slideId: assertString(raw.slideId, ['ops', opIndex, 'slideId'], 'slideId'),
            elementId: assertString(raw.elementId, ['ops', opIndex, 'elementId'], 'elementId'),
        };
    }
    if (raw.op === 'duplicateElement') {
        return {
            op: 'duplicateElement',
            slideId: assertString(raw.slideId, ['ops', opIndex, 'slideId'], 'slideId'),
            elementId: assertString(raw.elementId, ['ops', opIndex, 'elementId'], 'elementId'),
            newElementId: assertString(raw.newElementId, ['ops', opIndex, 'newElementId'], 'newElementId'),
        };
    }
    throw new EditorPatchError('invalid-operation', `Unsupported operation "${String(raw.op)}"`, ['ops', opIndex, 'op']);
}
export function normalizeEditorSaveRequest(input) {
    if (!isRecord(input)) {
        throw new EditorPatchError('invalid-request', 'Editor save request must be an object');
    }
    const baseRevision = assertString(input.baseRevision, ['baseRevision'], 'baseRevision');
    if (!Array.isArray(input.ops)) {
        throw new EditorPatchError('invalid-request', 'ops must be an array', ['ops']);
    }
    return {
        baseRevision,
        ops: input.ops.map((op, index) => normalizeOperation(op, index)),
    };
}
function normalizeChanges(raw, opIndex) {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!CHANGE_FIELDS.has(key)) {
            throw new EditorPatchError('unsupported-field', `Unsupported editor field "${key}"`, ['ops', opIndex, 'changes', key]);
        }
        const field = key;
        if (FINITE_NUMBER_FIELDS.has(field)) {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new EditorPatchError('invalid-value', `${field} must be a finite number`, ['ops', opIndex, 'changes', field]);
            }
            if (POSITIVE_NUMBER_FIELDS.has(field) && value <= 0) {
                throw new EditorPatchError('invalid-value', `${field} must be greater than 0`, ['ops', opIndex, 'changes', field]);
            }
            if (NONNEGATIVE_NUMBER_FIELDS.has(field) && value < 0) {
                throw new EditorPatchError('invalid-value', `${field} must be greater than or equal to 0`, ['ops', opIndex, 'changes', field]);
            }
            normalized[field] = value;
            continue;
        }
        if (STRING_FIELDS.has(field)) {
            if (typeof value !== 'string') {
                throw new EditorPatchError('invalid-value', `${field} must be a string`, ['ops', opIndex, 'changes', field]);
            }
            if (field === 'fontWeight' && value !== 'normal' && value !== 'bold') {
                if (!/^[1-9]00$/.test(value) || value === '000') {
                    throw new EditorPatchError('invalid-value', 'fontWeight must be "normal", "bold", or a 100-900 string', ['ops', opIndex, 'changes', field]);
                }
            }
            if (field === 'fontStyle' && value !== 'normal' && value !== 'italic') {
                throw new EditorPatchError('invalid-value', 'fontStyle must be "normal" or "italic"', ['ops', opIndex, 'changes', field]);
            }
            if (field === 'textDecoration' && value !== 'none' && value !== 'underline') {
                throw new EditorPatchError('invalid-value', 'textDecoration must be "none" or "underline"', ['ops', opIndex, 'changes', field]);
            }
            if (field === 'align' && value !== 'left' && value !== 'center' && value !== 'right') {
                throw new EditorPatchError('invalid-value', 'align must be "left", "center", or "right"', ['ops', opIndex, 'changes', field]);
            }
            normalized[field] = value;
            continue;
        }
    }
    return normalized;
}
function normalizeAddElement(raw, opIndex) {
    if (raw.type !== 'text') {
        throw new EditorPatchError('unsupported-element', 'Only text elements can be added in the editor', ['ops', opIndex, 'element', 'type']);
    }
    return cloneElement(raw);
}
function applyReorder(deck, op, opIndex) {
    const currentIds = deck.slides.map((slide) => slide.id);
    if (op.slideIds.length !== currentIds.length) {
        throw new EditorPatchError('invalid-slide-set', 'slideIds must contain exactly the existing slide IDs', ['ops', opIndex, 'slideIds']);
    }
    const expected = new Set(currentIds);
    const seen = new Set();
    for (const [index, id] of op.slideIds.entries()) {
        if (!expected.has(id) || seen.has(id)) {
            throw new EditorPatchError('invalid-slide-set', 'slideIds must contain each existing slide ID exactly once', ['ops', opIndex, 'slideIds', index]);
        }
        seen.add(id);
    }
    const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
    deck.slides = op.slideIds.map((id) => byId.get(id));
    return op.slideIds.some((id, index) => id !== currentIds[index]);
}
function applyDeleteSlide(deck, op, opIndex) {
    if (deck.slides.length <= 1) {
        throw new EditorPatchError('cannot-delete-last-slide', 'Cannot delete the final slide', ['ops', opIndex, 'slideId']);
    }
    const index = deck.slides.findIndex((slide) => slide.id === op.slideId);
    if (index < 0) {
        throw new EditorPatchError('slide-not-found', `Slide "${op.slideId}" was not found`, ['ops', opIndex, 'slideId']);
    }
    deck.slides.splice(index, 1);
    return true;
}
function assertSupportedEditorElement(element, opIndex) {
    if (!EDITOR_STRUCTURAL_ELEMENT_TYPE_SET.has(element.type)) {
        throw new EditorPatchError('unsupported-element', `Element type "${element.type}" is read-only in the editor`, ['ops', opIndex, 'elementId']);
    }
}
function assertEditableElement(element, opIndex) {
    if (element.rotation !== undefined && element.rotation !== 0) {
        throw new EditorPatchError('unsupported-rotated-element', 'Rotated elements are read-only for geometry/style updates in the editor', ['ops', opIndex, 'elementId']);
    }
    if (!EDITOR_UPDATE_ELEMENT_TYPE_SET.has(element.type)) {
        throw new EditorPatchError('unsupported-element', `Element type "${element.type}" is read-only in the editor`, ['ops', opIndex, 'elementId']);
    }
}
function assertAllowedFields(element, changes, opIndex) {
    const allowed = element.type === 'text' ? TEXT_FIELDS
        : element.type === 'animatedText' ? ANIMATED_TEXT_FIELDS
            : element.type === 'image' ? IMAGE_FIELDS
                : element.type === 'line' ? LINE_FIELDS
                    : element.type === 'circle' ? CIRCLE_FIELDS
                        : element.type === 'ellipse' ? ELLIPSE_FIELDS
                            : element.type === 'path' || element.type === 'polygon' ? PATH_POLYGON_FIELDS
                                : element.type === 'formula' ? FORMULA_FIELDS
                                    : RECT_FIELDS;
    for (const key of Object.keys(changes)) {
        if (!allowed.has(key)) {
            throw new EditorPatchError('unsupported-field', `Field "${key}" is not editable on ${element.type} elements`, ['ops', opIndex, 'changes', key]);
        }
    }
}
function applyUpdateElement(deck, op, opIndex) {
    const { slide, slideIndex } = findSlide(deck, op.slideId, opIndex);
    const { element, elementIndex } = findTopLevelElement(slide, slideIndex, op.elementId, opIndex);
    assertEditableElement(element, opIndex);
    assertAllowedFields(element, op.changes, opIndex);
    let changed = false;
    const mutableElement = slide.elements[elementIndex];
    for (const [key, value] of Object.entries(op.changes)) {
        const mutableRecord = mutableElement;
        if (mutableRecord[key] !== value) {
            mutableRecord[key] = value;
            changed = true;
        }
    }
    return changed;
}
function assertNoTopLevelElementId(slide, slideIndex, elementId, opIndex, field = 'elementId') {
    ensureNoDuplicateTopLevelElementIds(slide, slideIndex);
    if (slide.elements.some((element) => element.id === elementId)) {
        throw new EditorPatchError('duplicate-element-id', `Top-level element id "${elementId}" already exists in slide "${slide.id}"`, ['ops', opIndex, field]);
    }
}
function applyAddElement(deck, op, opIndex) {
    const { slide, slideIndex } = findSlide(deck, op.slideId, opIndex);
    assertNoTopLevelElementId(slide, slideIndex, op.element.id, opIndex, 'element.id');
    slide.elements.push(cloneElement(op.element));
    return true;
}
function applyDeleteElement(deck, op, opIndex) {
    const { slide, slideIndex } = findSlide(deck, op.slideId, opIndex);
    const { element, elementIndex } = findTopLevelElement(slide, slideIndex, op.elementId, opIndex);
    assertSupportedEditorElement(element, opIndex);
    slide.elements.splice(elementIndex, 1);
    return true;
}
function offsetDuplicatedElement(element) {
    const next = cloneElement(element);
    next.x += 24;
    next.y += 24;
    if (next.type === 'line') {
        next.x2 += 24;
        next.y2 += 24;
    }
    return next;
}
function applyDuplicateElement(deck, op, opIndex) {
    const { slide, slideIndex } = findSlide(deck, op.slideId, opIndex);
    const { element, elementIndex } = findTopLevelElement(slide, slideIndex, op.elementId, opIndex);
    assertSupportedEditorElement(element, opIndex);
    assertNoTopLevelElementId(slide, slideIndex, op.newElementId, opIndex, 'newElementId');
    const duplicated = offsetDuplicatedElement(element);
    duplicated.id = op.newElementId;
    slide.elements.splice(elementIndex + 1, 0, duplicated);
    return true;
}
export function applyEditorPatch(deck, request) {
    const next = cloneDeck(deck);
    let changed = false;
    request.ops.forEach((op, index) => {
        const normalized = normalizeOperation(op, index);
        if (normalized.op === 'reorderSlides') {
            changed = applyReorder(next, normalized, index) || changed;
            return;
        }
        if (normalized.op === 'deleteSlide') {
            changed = applyDeleteSlide(next, normalized, index) || changed;
            return;
        }
        if (normalized.op === 'addElement') {
            changed = applyAddElement(next, normalized, index) || changed;
            return;
        }
        if (normalized.op === 'deleteElement') {
            changed = applyDeleteElement(next, normalized, index) || changed;
            return;
        }
        if (normalized.op === 'duplicateElement') {
            changed = applyDuplicateElement(next, normalized, index) || changed;
            return;
        }
        changed = applyUpdateElement(next, normalized, index) || changed;
    });
    const validation = validateDeck(next);
    if (!validation.success) {
        throw new EditorPatchError('validation-failed', 'Patched deck failed schema validation', [], validation.errors);
    }
    return { deck: validation.data, changed };
}
export function isEditorPatchError(error) {
    return error instanceof EditorPatchError;
}
export const EDITOR_SUPPORTED_OPS = ['reorderSlides', 'deleteSlide', 'updateElement', 'addElement', 'deleteElement', 'duplicateElement'];
export const EDITOR_SUPPORTED_ELEMENT_TYPES = ['text', 'animatedText', 'rect', 'circle', 'ellipse', 'line', 'image', 'path', 'polygon', 'formula'];
//# sourceMappingURL=editor-patch.js.map