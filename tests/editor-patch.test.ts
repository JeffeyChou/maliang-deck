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
          { type: 'animatedText', id: 'animated', x: 30, y: 40, width: 250, height: 80, fontSize: 26, content: 'Motion', textAnimation: { name: 'typewriter' } } as any,
          { type: 'circle', id: 'circle', x: 1, y: 2, radius: 10 } as any,
          { type: 'ellipse', id: 'oval', x: 10, y: 12, width: 60, height: 40, fill: '#ddd' } as any,
          { type: 'line', id: 'line1', x: 50, y: 50, x2: 200, y2: 150, stroke: '#000', strokeWidth: 2 } as any,
          { type: 'path', id: 'blob', x: 5, y: 6, width: 100, height: 80, d: 'M0 0L10 0L10 10Z', fill: '#fff' } as any,
          { type: 'polygon', id: 'poly', x: 15, y: 16, width: 100, height: 80, points: '0,0 10,0 10,10', fill: '#fff' } as any,
          { type: 'formula', id: 'equation', x: 25, y: 26, width: 180, latex: 'x^2', fontSize: 24 } as any,
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
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 11, y: 22, width: 320, height: 90, content: 'Edited', fontSize: 36, fontFamily: 'serif', fontWeight: 'bold', fontStyle: 'italic' } }],
    });

    const edited = result.deck.slides[0].elements[0];
    expect(edited).toMatchObject({ x: 11, y: 22, width: 320, height: 90, content: 'Edited', fontSize: 36, fontFamily: 'serif', fontWeight: 'bold', fontStyle: 'italic' });
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

  it('deletes slides but keeps at least one slide', () => {
    const result = applyEditorPatch(baseDeck(), { ops: [{ op: 'deleteSlide', slideId: 'slide-a' }] });
    expect(result.deck.slides.map((slide) => slide.id)).toEqual(['slide-b']);

    expectPatchError(() => applyEditorPatch(result.deck, { ops: [{ op: 'deleteSlide', slideId: 'slide-b' }] }), 'cannot-delete-last-slide');
  });

  it('rejects unsupported fields and invalid values', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { fill: '#fff' } }] }), 'unsupported-field');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { width: 0 } }] }), 'invalid-value');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: Number.NaN } }] }), 'invalid-value');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { fontWeight: 'heavy' } }] }), 'invalid-value');
    expectPatchError(() => normalizeEditorSaveRequest({ baseRevision: 'abc', ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { align: 'justify' } }] }), 'invalid-value');
  });

  it('applies textDecoration on text elements', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { textDecoration: 'underline' } }],
    });
    expect(result.deck.slides[0].elements[0]).toMatchObject({ textDecoration: 'underline' });
  });

  it('applies circle element updates', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'circle', changes: { x: 50, y: 60, radius: 25, fill: '#f00', stroke: '#0f0', strokeWidth: 3 } }],
    });
    expect(result.deck.slides[0].elements[3]).toMatchObject({ x: 50, y: 60, radius: 25, fill: '#f00', stroke: '#0f0', strokeWidth: 3 });
  });

  it('applies line element updates', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'line1', changes: { x: 60, y: 70, x2: 210, y2: 160, stroke: '#f00', strokeWidth: 4 } }],
    });
    expect(result.deck.slides[0].elements[5]).toMatchObject({ x: 60, y: 70, x2: 210, y2: 160, stroke: '#f00', strokeWidth: 4 });
  });

  it('applies animated text visual updates without changing animation config', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'animated', changes: { x: 44, y: 55, content: 'Edited motion', fontSize: 30, fontFamily: 'serif', fontWeight: '700', color: '#123456', align: 'center', lineHeight: 1.4 } }],
    });
    expect(result.deck.slides[0].elements[2]).toMatchObject({
      x: 44,
      y: 55,
      content: 'Edited motion',
      fontSize: 30,
      fontFamily: 'serif',
      fontWeight: '700',
      color: '#123456',
      align: 'center',
      lineHeight: 1.4,
      textAnimation: { name: 'typewriter' },
    });
  });

  it('applies ellipse, path, and polygon geometry/style updates without shape data edits', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [
        { op: 'updateElement', slideId: 'slide-a', elementId: 'oval', changes: { x: 20, y: 30, width: 70, height: 50, fill: '#f00', stroke: '#0f0', strokeWidth: 2 } },
        { op: 'updateElement', slideId: 'slide-a', elementId: 'blob', changes: { x: 21, y: 31, width: 71, height: 51, fill: '#111', stroke: '#222', strokeWidth: 3 } },
        { op: 'updateElement', slideId: 'slide-a', elementId: 'poly', changes: { x: 22, y: 32, width: 72, height: 52, fill: '#333', stroke: '#444', strokeWidth: 4 } },
      ],
    });
    expect(result.deck.slides[0].elements[4]).toMatchObject({ x: 20, y: 30, width: 70, height: 50, fill: '#f00', stroke: '#0f0', strokeWidth: 2 });
    expect(result.deck.slides[0].elements[6]).toMatchObject({ x: 21, y: 31, width: 71, height: 51, fill: '#111', stroke: '#222', strokeWidth: 3, d: 'M0 0L10 0L10 10Z' });
    expect(result.deck.slides[0].elements[7]).toMatchObject({ x: 22, y: 32, width: 72, height: 52, fill: '#333', stroke: '#444', strokeWidth: 4, points: '0,0 10,0 10,10' });
  });

  it('applies formula position updates while keeping formula content read-only', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'equation', changes: { x: 77, y: 88 } }],
    });
    expect(result.deck.slides[0].elements[8]).toMatchObject({ type: 'formula', x: 77, y: 88, latex: 'x^2' });

    expectPatchError(() => applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'equation', changes: { width: 240 } }],
    }), 'unsupported-field');
    expectPatchError(() => applyEditorPatch(baseDeck(), {
      ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'equation', changes: { content: 'y^2' } }],
    }), 'unsupported-field');
    expectPatchError(() => applyEditorPatch(baseDeck(), {
      ops: [{ op: 'duplicateElement', slideId: 'slide-a', elementId: 'equation', newElementId: 'equation-copy' }],
    }), 'unsupported-element');
  });

  it('adds, duplicates, edits, and deletes top-level supported elements in order', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [
        { op: 'addElement', slideId: 'slide-a', element: { type: 'text', id: 'text-1', x: 480, y: 328, width: 320, height: 64, fontSize: 28, content: 'New text' } },
        { op: 'updateElement', slideId: 'slide-a', elementId: 'text-1', changes: { content: 'Saved text', color: '#333333', align: 'right', lineHeight: 1.3 } },
        { op: 'duplicateElement', slideId: 'slide-a', elementId: 'title', newElementId: 'title-copy' },
        { op: 'updateElement', slideId: 'slide-a', elementId: 'title-copy', changes: { x: 99, y: 101 } },
        { op: 'deleteElement', slideId: 'slide-a', elementId: 'title-copy' },
      ],
    });
    const ids = result.deck.slides[0].elements.map((element) => element.id);
    expect(ids).toContain('text-1');
    expect(ids).not.toContain('title-copy');
    expect(result.deck.slides[0].elements.find((element) => element.id === 'text-1')).toMatchObject({ content: 'Saved text', color: '#333333', align: 'right', lineHeight: 1.3 });
  });

  it('duplicates supported elements with a new id and 24px geometry offset', () => {
    const result = applyEditorPatch(baseDeck(), {
      ops: [{ op: 'duplicateElement', slideId: 'slide-a', elementId: 'line1', newElementId: 'line1-copy' }],
    });
    expect(result.deck.slides[0].elements.find((element) => element.id === 'line1-copy')).toMatchObject({
      type: 'line',
      x: 74,
      y: 74,
      x2: 224,
      y2: 174,
      stroke: '#000',
    });
  });

  it('rejects structural collisions, unsupported add types, and nested structural targets', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'addElement', slideId: 'slide-a', element: { type: 'text', id: 'title', x: 1, y: 2, width: 100, fontSize: 12, content: 'dupe' } }] }), 'duplicate-element-id');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'addElement', slideId: 'slide-a', element: { type: 'rect', id: 'new-rect', x: 1, y: 2, width: 100, height: 30 } }] as any }), 'unsupported-element');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'deleteElement', slideId: 'slide-a', elementId: 'nested' }] }), 'element-not-found');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'duplicateElement', slideId: 'slide-a', elementId: 'nested', newElementId: 'nested-copy' }] }), 'element-not-found');
  });

  it('rejects unsupported fields on circle and line elements', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'circle', changes: { content: 'nope' } }] }), 'unsupported-field');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'line1', changes: { fontSize: 12 } }] }), 'unsupported-field');
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'blob', changes: { d: 'M0 0Z' } as any }] }), 'unsupported-field');
  });

  it('rejects unsupported, nested, rotated, and duplicate top-level targets', () => {
    expectPatchError(() => applyEditorPatch(baseDeck(), { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'nested', changes: { x: 10 } }] }), 'element-not-found');

    const rotated = baseDeck();
    rotated.slides[0].elements[0].rotation = 10;
    expectPatchError(() => applyEditorPatch(rotated, { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 10 } }] }), 'unsupported-rotated-element');

    const duplicate = baseDeck();
    duplicate.slides[0].elements.push({ type: 'text', id: 'title', x: 1, y: 2, width: 3, fontSize: 4, content: 'dupe' });
    expectPatchError(() => applyEditorPatch(duplicate, { ops: [{ op: 'updateElement', slideId: 'slide-a', elementId: 'title', changes: { x: 10 } }] }), 'duplicate-element-id');
  });
});
