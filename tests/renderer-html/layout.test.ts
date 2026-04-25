import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '../../packages/renderer-html/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

const deck: Deck = {
  meta: { title: 'html layout', canvas: { width: 640, height: 360 } },
  slides: [
    {
      id: 'slide-1',
      elements: [
        {
          type: 'layout',
          id: 'grid-layout',
          x: 20,
          y: 30,
          width: 300,
          height: 120,
          layout: { mode: 'grid', columns: [100, 120], rows: [40], gap: 10, padding: 8 },
          elements: [
            { type: 'text', id: 'item', x: 999, y: 999, width: 80, fontSize: 16, content: 'Item', animation: { enter: 'fade-up', step: 1 } },
          ],
        },
      ],
    },
  ],
};

describe('HTML layout rendering', () => {
  it('emits a grid preview container while preserving element IDs and animations', () => {
    const html = renderDeckToHtml(deck);

    expect(html).toContain('data-maliang-deck-element="layout"');
    expect(html).toContain('data-maliang-deck-layout-mode="grid"');
    expect(html).toContain('display: grid');
    expect(html).toContain('grid-template-columns: 100px 120px');
    expect(html).toContain('overflow: visible');
    expect(html).toContain('id="slide-1__grid-layout"');
    expect(html).toContain('id="slide-1__item"');
    expect(html).toContain('data-anim-step="1"');
    expect(html).toContain('left: 8px');
    expect(html).toContain('top: 8px');
    expect(html).not.toContain('htmlStyle');
  });

  it('keeps nested layout containers so their live-preview semantics are preserved', () => {
    const html = renderDeckToHtml({
      ...deck,
      slides: [{
        id: 'slide-1',
        elements: [{
          type: 'layout',
          id: 'outer',
          x: 0,
          y: 0,
          width: 320,
          height: 160,
          layout: { mode: 'grid', columns: [160], rows: [100] },
          elements: [{
            type: 'layout',
            id: 'inner',
            x: 0,
            y: 0,
            width: 140,
            height: 90,
            rotation: 12,
            opacity: 0.5,
            overflow: 'clip',
            layout: { mode: 'flex', justifyContent: 'center' },
            elements: [
              { type: 'rect', id: 'nested-child', x: 0, y: 0, width: 40, height: 20 },
            ],
          }],
        }],
      }],
    });

    expect(html.match(/data-maliang-deck-element="layout"/g)).toHaveLength(2);
    expect(html).toContain('id="slide-1__inner"');
    expect(html).toContain('transform: rotate(12deg)');
    expect(html).toContain('overflow: hidden');
  });
});
