import { describe, expect, it } from 'vitest';
import { resolveLayoutElement, validateDeck, type Deck, type LayoutElement } from '@maliang-deck/schema';

function deckWith(element: Deck['slides'][number]['elements'][number]): Deck {
  return {
    meta: { title: 'layout schema', canvas: { width: 1280, height: 720 } },
    slides: [{ id: 'slide-1', elements: [element] }],
  };
}

const validGrid: LayoutElement = {
  type: 'layout',
  id: 'grid',
  x: 100,
  y: 50,
  width: 420,
  height: 220,
  layout: { mode: 'grid', columns: [120, 120], rows: [80, 80], gap: { row: 10, column: 20 }, padding: 10 },
  elements: [
    { type: 'rect', id: 'a', x: 999, y: 999, width: 40, height: 30, fill: '#f00', placement: { column: 0, row: 0 } },
    { type: 'rect', id: 'b', x: 0, y: 0, width: 40, height: 30, fill: '#0f0', placement: { column: 1, row: 0, columnSpan: 1 } },
  ],
};

describe('layout schema validation', () => {
  it('accepts valid grid and flex layout containers', () => {
    expect(validateDeck(deckWith(validGrid)).success).toBe(true);
    expect(validateDeck(deckWith({
      type: 'layout',
      id: 'flex',
      x: 0,
      y: 0,
      width: 500,
      height: 120,
      layout: { mode: 'flex', direction: 'row', wrap: true, gap: 12, padding: { left: 8, right: 8 } },
      elements: [
        { type: 'text', id: 'one', x: 0, y: 0, width: 120, fontSize: 18, content: 'One', placement: { basis: 140 } },
      ],
    })).success).toBe(true);
  });

  it.each([
    ['zero layout width', { ...validGrid, width: 0 }],
    ['zero grid track', { ...validGrid, layout: { mode: 'grid', columns: [0] } }],
    ['negative gap', { ...validGrid, layout: { mode: 'grid', columns: [100], gap: -1 } }],
    ['non-integer column', { ...validGrid, elements: [{ ...validGrid.elements[0], placement: { column: 0.5 } }] }],
    ['zero span', { ...validGrid, elements: [{ ...validGrid.elements[0], placement: { column: 0, columnSpan: 0 } }] }],
    ['span exceeds columns', { ...validGrid, elements: [{ ...validGrid.elements[0], placement: { column: 1, columnSpan: 2 } }] }],
    ['overlapping explicit cells', { ...validGrid, elements: [
      { ...validGrid.elements[0], placement: { column: 0, row: 0 } },
      { ...validGrid.elements[1], placement: { column: 0, row: 0 } },
    ] }],
    ['zero flex basis', { ...validGrid, layout: { mode: 'flex', direction: 'row' }, elements: [{ ...validGrid.elements[0], placement: { basis: 0 } }] }],
    ['flow placement with x', { ...validGrid, elements: [{ ...validGrid.elements[0], placement: { mode: 'flow', x: 1 } }] }],
  ])('rejects invalid layout: %s', (_name, element) => {
    expect(validateDeck(deckWith(element as LayoutElement)).success).toBe(false);
  });
});

describe('layout resolver', () => {
  it('resolves grid children without mutating source child x/y', () => {
    const before = JSON.stringify(validGrid);
    const records = resolveLayoutElement(validGrid, { originX: 0, originY: 0, path: 'slides[0].elements[0]' });

    expect(JSON.stringify(validGrid)).toBe(before);
    expect(records.map((record) => ({ id: record.element.id, x: record.element.x, y: record.element.y }))).toEqual([
      { id: 'a', x: 110, y: 60 },
      { id: 'b', x: 250, y: 60 },
    ]);
  });

  it('auto-places grid children into the next free cell after explicit placements', () => {
    const layout: LayoutElement = {
      ...validGrid,
      elements: [
        { type: 'rect', id: 'explicit', x: 0, y: 0, width: 40, height: 30, placement: { column: 0, row: 0 } },
        { type: 'rect', id: 'auto', x: 0, y: 0, width: 40, height: 30 },
      ],
    };
    const records = resolveLayoutElement(layout, { originX: 0, originY: 0, path: 'layout' });

    expect(records.map((record) => ({ id: record.element.id, x: record.element.x, y: record.element.y }))).toEqual([
      { id: 'explicit', x: 110, y: 60 },
      { id: 'auto', x: 250, y: 60 },
    ]);
  });

  it('uses absolute placement relative to the layout box and reports overflow', () => {
    const layout: LayoutElement = {
      ...validGrid,
      overflow: 'warn',
      elements: [
        { type: 'rect', id: 'abs', x: 1, y: 2, width: 50, height: 50, placement: { mode: 'absolute', x: -10, y: 12 } },
      ],
    };
    const records = resolveLayoutElement(layout, { originX: 0, originY: 0, path: 'slides[0].elements[0]' });

    expect(records[0].element).toMatchObject({ id: 'abs', x: 90, y: 62 });
    expect(records[0].diagnostics).toContainEqual(expect.objectContaining({ code: 'layout-overflow', elementId: 'abs' }));
  });

  it('wraps flex rows deterministically', () => {
    const layout: LayoutElement = {
      type: 'layout',
      id: 'flex-wrap',
      x: 0,
      y: 0,
      width: 220,
      height: 200,
      layout: { mode: 'flex', direction: 'row', wrap: true, gap: 10, padding: 0 },
      elements: [
        { type: 'rect', id: 'a', x: 0, y: 0, width: 100, height: 20 },
        { type: 'rect', id: 'b', x: 0, y: 0, width: 100, height: 30 },
        { type: 'rect', id: 'c', x: 0, y: 0, width: 100, height: 40 },
      ],
    };
    const records = resolveLayoutElement(layout, { originX: 0, originY: 0, path: 'layout' });

    expect(records.map((record) => ({ id: record.element.id, x: record.element.x, y: record.element.y }))).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 110, y: 0 },
      { id: 'c', x: 0, y: 40 },
    ]);
  });

  it('applies flex justifyContent deterministically for static exports', () => {
    const layout: LayoutElement = {
      type: 'layout',
      id: 'flex-center',
      x: 10,
      y: 20,
      width: 300,
      height: 80,
      layout: { mode: 'flex', direction: 'row', justifyContent: 'center', gap: 10 },
      elements: [
        { type: 'rect', id: 'a', x: 0, y: 0, width: 50, height: 20 },
        { type: 'rect', id: 'b', x: 0, y: 0, width: 50, height: 20 },
      ],
    };

    const records = resolveLayoutElement(layout, { originX: 0, originY: 0, path: 'layout' });

    expect(records.map((record) => ({ id: record.element.id, x: record.element.x, y: record.element.y }))).toEqual([
      { id: 'a', x: 105, y: 20 },
      { id: 'b', x: 165, y: 20 },
    ]);
  });
});
