import { describe, expect, it } from 'vitest';
import type { Deck } from '../packages/schema/src/index.js';
import {
  EditorPatchError,
  applyEditorPatch,
  normalizeEditorSaveRequest,
} from '../packages/schema/src/editor-patch.js';

function baseDeck(): Deck {
  return {
    meta: { title: 'Editor', canvas: { width: 1280, height: 720 } },
    slides: [
      {
        id: 'slide-a',
        elements: [
          { type: 'text', id: 'title', x: 10, y: 20, width: 300, height: 80, fontSize: 32, content: 'Hello' },
          { type: 'rect', id: 'box', x: 100, y: 120, width: 200, height: 100, fill: '#fff', stroke: '#000', strokeWidth: 2, radius: 4 },
          { type: 'circle', id: 'circle', x: 1, y: 2, radius: 10 },
          { type: 'group', id: 'group', x: 0, y: 0, elements: [{ type: 'text', id: 'nested', x: 0, y: 0, width: 10, fontSize: 10, content: 'n' }] },
        ],
      },
      { id: 'slide-b', elements: [{ type: 'text', id: 'body', x: 20, y: 30, width: 240, fontSize: 18, content: 'Body' }] },
    ],
  };
}

function expectPatchError(fn: () => unknown, code: string): void {
  expect(fn).toThrow(EditorPatchError);
  try {
    fn();
  } catch (error) {
    expect((error as EditorPatchError).code).toBe(code);
  }
}

describe('editor patch contract', () => {
  it('normalizes save requests with required base revision', () => {
    expect(normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [] })).toEqual({ baseRevision: 'abc', ops: [] });
    expectPatchError(() => normalizeEditorSaveRequest({ ops: [] }), 'invalid-operation');
  });

  it('applies top-level text updates without mutating the original deck', () => {
    const deck = baseDeck();
    const result = applyEditorPatch(deck, {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 11, y: 22, width: 320, height: 90, content: 'Edited', fontSize: 36 } }],
    });

    const edited = result.deck.slides[0].elements[0];
    expect(edited).toMatchObject({ x: 11, y: 22, width: 320, height: 90, content: 'Edited', fontSize: 36 });
    expect(deck.slides[0].elements[0]).toMatchObject({ x: 10, y: 20, content: 'Hello', fontSize: 32 });
  });

  it('applies top-level rect updates', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'box', changes: { x: 111, y: 222, width: 333, height: 144, fill: '#f00', stroke: '#0f0', strokeWidth: 5, radius: 12 } }],
    });

    expect(result.deck.slides[0].elements[1]).toMatchObject({ x: 111, y: 222, width: 333, height: 144, fill: '#f00', stroke: '#0f0', strokeWidth: 5, radius: 12 });
  });

  it('reorders slides only when slide IDs match exactly once', () => {
    const result = applyEditorPatch(baseDeck(), { ops: [{ op: 'reorderSlides', slideIds: ['slide-b', 'slide-a'] }] });
    expect(result.deck.slides.map((slide) => slide.id)).toEqual(['slide-b', 'slide-a']);

    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'reorderSlides', slideIds: ['slide-a'] }] }), 'invalid-slide-set');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'reorderSlides', slideIds: ['slide-a', 'slide-a'] }] }), 'invalid-slide-set');
  });

  it('rejects unsupported fields and invalid values', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { fill: '#fff' } }] }), 'unsupported-field');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { width: 0 } }] }), 'invalid-value');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: Number.NaN } }] }), 'invalid-value');
  });

  it('rejects unsupported, nested, rotated, and duplicate top-level targets', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'circle', changes: { x: 10 } }] }), 'unsupported-element');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'nested', changes: { x: 10 } }] }), 'element-not-found');

    const rotated = baseDeck();
    rotated.slides[0].elements[0].rotation = 10;
    expectPatchError(() => applyEditorPatch(rotated, { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 10 } }] }), 'unsupported-rotated-element');

    const duplicate = baseDeck();
    duplicate.slides[0].elements.push({ type: 'text', id: 'title', x: 1, y: 2, width: 3, fontSize: 4, content: 'dupe' });
    expectPatchError(() => applyEditorPatch(duplicate, { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 10 } }] }), 'duplicate-element-id');
  });
});
