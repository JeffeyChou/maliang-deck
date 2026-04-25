import type { Deck, Element, ImageElement, RectElement, Slide, TextElement } from './types.js';
import { validateDeck, type ValidationError } from './schema.js';

export type EditorSaveRequest = {
  baseRevision: string;
  ops: EditorOperation[];
};

export type EditorOperation = ReorderSlidesOperation | DeleteSlideOperation | UpdateElementOperation;

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

export type EditorElementChanges = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
};

export type EditorPatchErrorCode =
  | 'invalid-request'
  | 'invalid-operation'
  | 'invalid-slide-set'
  | 'cannot-delete-last-slide'
  | 'duplicate-element-id'
  | 'slide-not-found'
  | 'element-not-found'
  | 'unsupported-element'
  | 'unsupported-field'
  | 'unsupported-rotated-element'
  | 'invalid-value'
  | 'validation-failed';

export class EditorPatchError extends Error {
  readonly code: EditorPatchErrorCode;
  readonly path: Array<string | number>;
  readonly validationErrors?: ValidationError[];

  constructor(code: EditorPatchErrorCode, message: string, path: Array<string | number> = [], validationErrors?: ValidationError[]) {
    super(message);
    this.name = 'EditorPatchError';
    this.code = code;
    this.path = path;
    this.validationErrors = validationErrors;
  }
}

export type ApplyEditorPatchResult = {
  deck: Deck;
  changed: boolean;
};

const TEXT_FIELDS = new Set<keyof EditorElementChanges>([
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
]);
const IMAGE_FIELDS = new Set<keyof EditorElementChanges>(['x', 'y', 'width', 'height']);
const RECT_FIELDS = new Set<keyof EditorElementChanges>(['x', 'y', 'width', 'height', 'fill', 'stroke', 'strokeWidth', 'radius']);
const POSITIVE_NUMBER_FIELDS = new Set<keyof EditorElementChanges>(['width', 'height', 'fontSize', 'strokeWidth']);
const FINITE_NUMBER_FIELDS = new Set<keyof EditorElementChanges>(['x', 'y', 'width', 'height', 'fontSize', 'strokeWidth', 'radius']);
const STRING_FIELDS = new Set<keyof EditorElementChanges>(['content', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'fill', 'stroke']);
const CHANGE_FIELDS = new Set<keyof EditorElementChanges>([
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
  'fill',
  'stroke',
  'strokeWidth',
  'radius',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneDeck(deck: Deck): Deck {
  return JSON.parse(JSON.stringify(deck)) as Deck;
}

function assertString(value: unknown, path: Array<string | number>, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new EditorPatchError('invalid-operation', `${field} must be a non-empty string`, path);
  }
  return value;
}

function assertStringArray(value: unknown, path: Array<string | number>, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new EditorPatchError('invalid-operation', `${field} must be an array of non-empty strings`, path);
  }
  return value as string[];
}

function ensureNoDuplicateTopLevelElementIds(slide: Slide, slideIndex: number): void {
  const seen = new Set<string>();
  slide.elements.forEach((element, elementIndex) => {
    if (seen.has(element.id)) {
      throw new EditorPatchError(
        'duplicate-element-id',
        `Duplicate top-level element id "${element.id}" in slide "${slide.id}"`,
        ['slides', slideIndex, 'elements', elementIndex, 'id'],
      );
    }
    seen.add(element.id);
  });
}

function findSlide(deck: Deck, slideId: string, opIndex: number): { slide: Slide; slideIndex: number } {
  const slideIndex = deck.slides.findIndex((slide) => slide.id === slideId);
  if (slideIndex < 0) {
    throw new EditorPatchError('slide-not-found', `Slide "${slideId}" was not found`, ['ops', opIndex, 'slideId']);
  }
  return { slide: deck.slides[slideIndex], slideIndex };
}

function findTopLevelElement(slide: Slide, slideIndex: number, elementId: string, opIndex: number): { element: Element; elementIndex: number } {
  ensureNoDuplicateTopLevelElementIds(slide, slideIndex);
  const elementIndex = slide.elements.findIndex((element) => element.id === elementId);
  if (elementIndex < 0) {
    throw new EditorPatchError('element-not-found', `Top-level element "${elementId}" was not found`, ['ops', opIndex, 'elementId']);
  }
  return { element: slide.elements[elementIndex], elementIndex };
}

function normalizeOperation(raw: unknown, opIndex: number): EditorOperation {
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
  throw new EditorPatchError('invalid-operation', `Unsupported operation "${String(raw.op)}"`, ['ops', opIndex, 'op']);
}

export function normalizeEditorSaveRequest(input: unknown): EditorSaveRequest {
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

function normalizeChanges(raw: Record<string, unknown>, opIndex: number): EditorElementChanges {
  const normalized: EditorElementChanges = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!CHANGE_FIELDS.has(key as keyof EditorElementChanges)) {
      throw new EditorPatchError('unsupported-field', `Unsupported editor field "${key}"`, ['ops', opIndex, 'changes', key]);
    }
    const field = key as keyof EditorElementChanges;
    if (FINITE_NUMBER_FIELDS.has(field)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new EditorPatchError('invalid-value', `${field} must be a finite number`, ['ops', opIndex, 'changes', field]);
      }
      if (POSITIVE_NUMBER_FIELDS.has(field) && value <= 0) {
        throw new EditorPatchError('invalid-value', `${field} must be greater than 0`, ['ops', opIndex, 'changes', field]);
      }
      (normalized as Record<string, unknown>)[field] = value;
      continue;
    }
    if (STRING_FIELDS.has(field)) {
      if (typeof value !== 'string') {
        throw new EditorPatchError('invalid-value', `${field} must be a string`, ['ops', opIndex, 'changes', field]);
      }
      if (field === 'fontWeight' && value !== 'normal' && value !== 'bold') {
        throw new EditorPatchError('invalid-value', 'fontWeight must be "normal" or "bold"', ['ops', opIndex, 'changes', field]);
      }
      if (field === 'fontStyle' && value !== 'normal' && value !== 'italic') {
        throw new EditorPatchError('invalid-value', 'fontStyle must be "normal" or "italic"', ['ops', opIndex, 'changes', field]);
      }
      if (field === 'textDecoration' && value !== 'none' && value !== 'underline') {
        throw new EditorPatchError('invalid-value', 'textDecoration must be "none" or "underline"', ['ops', opIndex, 'changes', field]);
      }
      (normalized as Record<string, unknown>)[field] = value;
      continue;
    }
  }
  return normalized;
}

function applyReorder(deck: Deck, op: ReorderSlidesOperation, opIndex: number): boolean {
  const currentIds = deck.slides.map((slide) => slide.id);
  if (op.slideIds.length !== currentIds.length) {
    throw new EditorPatchError('invalid-slide-set', 'slideIds must contain exactly the existing slide IDs', ['ops', opIndex, 'slideIds']);
  }
  const expected = new Set(currentIds);
  const seen = new Set<string>();
  for (const [index, id] of op.slideIds.entries()) {
    if (!expected.has(id) || seen.has(id)) {
      throw new EditorPatchError('invalid-slide-set', 'slideIds must contain each existing slide ID exactly once', ['ops', opIndex, 'slideIds', index]);
    }
    seen.add(id);
  }
  const byId = new Map(deck.slides.map((slide) => [slide.id, slide]));
  deck.slides = op.slideIds.map((id) => byId.get(id)!);
  return op.slideIds.some((id, index) => id !== currentIds[index]);
}

function applyDeleteSlide(deck: Deck, op: DeleteSlideOperation, opIndex: number): boolean {
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

function assertEditableElement(element: Element, opIndex: number): asserts element is TextElement | RectElement | ImageElement {
  if (element.rotation !== undefined && element.rotation !== 0) {
    throw new EditorPatchError('unsupported-rotated-element', 'Rotated elements are read-only in the editor MVP', ['ops', opIndex, 'elementId']);
  }
  if (element.type !== 'text' && element.type !== 'rect' && element.type !== 'image') {
    throw new EditorPatchError('unsupported-element', `Element type "${element.type}" is read-only in the editor MVP`, ['ops', opIndex, 'elementId']);
  }
}

function assertAllowedFields(element: TextElement | RectElement | ImageElement, changes: EditorElementChanges, opIndex: number): void {
  const allowed = element.type === 'text' ? TEXT_FIELDS : element.type === 'image' ? IMAGE_FIELDS : RECT_FIELDS;
  for (const key of Object.keys(changes) as Array<keyof EditorElementChanges>) {
    if (!allowed.has(key)) {
      throw new EditorPatchError('unsupported-field', `Field "${key}" is not editable on ${element.type} elements`, ['ops', opIndex, 'changes', key]);
    }
  }
}

function applyUpdateElement(deck: Deck, op: UpdateElementOperation, opIndex: number): boolean {
  const { slide, slideIndex } = findSlide(deck, op.slideId, opIndex);
  const { element, elementIndex } = findTopLevelElement(slide, slideIndex, op.elementId, opIndex);
  assertEditableElement(element, opIndex);
  assertAllowedFields(element, op.changes, opIndex);

  let changed = false;
  const mutableElement = slide.elements[elementIndex] as TextElement | RectElement | ImageElement;
  for (const [key, value] of Object.entries(op.changes)) {
    const mutableRecord = mutableElement as unknown as Record<string, unknown>;
    if (mutableRecord[key] !== value) {
      mutableRecord[key] = value;
      changed = true;
    }
  }
  return changed;
}

export function applyEditorPatch(deck: Deck, request: Pick<EditorSaveRequest, 'ops'>): ApplyEditorPatchResult {
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
    changed = applyUpdateElement(next, normalized, index) || changed;
  });

  const validation = validateDeck(next);
  if (!validation.success) {
    throw new EditorPatchError('validation-failed', 'Patched deck failed schema validation', [], validation.errors);
  }

  return { deck: validation.data, changed };
}

export function isEditorPatchError(error: unknown): error is EditorPatchError {
  return error instanceof EditorPatchError;
}

export const EDITOR_SUPPORTED_OPS = ['reorderSlides', 'deleteSlide', 'updateElement'] as const;
export const EDITOR_SUPPORTED_ELEMENT_TYPES = ['text', 'rect', 'image'] as const;
