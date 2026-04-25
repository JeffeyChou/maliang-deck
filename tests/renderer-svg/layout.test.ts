import { describe, expect, it } from 'vitest';
import { renderDeckToSvg } from '../../packages/renderer-svg/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function deckWith(elements: Deck['slides'][number]['elements']): Deck {
  return { meta: { title: 'svg layout', canvas: { width: 640, height: 360 } }, slides: [{ id: 'slide-1', elements }] };
}

describe('SVG layout rendering', () => {
  it('flattens layout children to deterministic SVG geometry with diagnostics', () => {
    const result = renderDeckToSvg(deckWith([
      {
        type: 'layout',
        id: 'grid-layout',
        x: 20,
        y: 30,
        width: 300,
        height: 120,
        layout: { mode: 'grid', columns: [100, 120], rows: [40], gap: 10, padding: 8 },
        elements: [
          { type: 'rect', id: 'a', x: 999, y: 999, width: 30, height: 20, fill: '#f00' },
          { type: 'rect', id: 'b', x: 0, y: 0, width: 30, height: 20, fill: '#0f0' },
        ],
      },
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-deck-layout-id="grid-layout"');
    expect(svg).toContain('x="28"');
    expect(svg).toContain('y="38"');
    expect(svg).toContain('x="138"');
    expect(svg).not.toContain('<foreignObject');
    expect(result.warnings).toContainEqual(expect.objectContaining({ type: 'layout-flattened', elementId: 'grid-layout' }));
  });

  it('preserves layout-level clip, rotation, and opacity in SVG export', () => {
    const result = renderDeckToSvg(deckWith([
      {
        type: 'layout',
        id: 'clip-layout',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        rotation: 15,
        opacity: 0.5,
        overflow: 'clip',
        layout: { mode: 'grid', columns: [80], rows: [40] },
        elements: [
          { type: 'rect', id: 'a', x: 0, y: 0, width: 120, height: 20, fill: '#f00' },
        ],
      },
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('<clipPath');
    expect(svg).toContain('clip-path="url(#maliang-deck-layout-clip-clip-layout)"');
    expect(svg).toContain('rotate(15 60 45)');
    expect(svg).toContain('opacity="0.5"');
  });

  it('preserves nested layout-level clip, rotation, and opacity in SVG export', () => {
    const result = renderDeckToSvg(deckWith([
      {
        type: 'layout',
        id: 'outer',
        x: 0,
        y: 0,
        width: 240,
        height: 120,
        layout: { mode: 'grid', columns: [180], rows: [80] },
        elements: [{
          type: 'layout',
          id: 'inner',
          x: 0,
          y: 0,
          width: 120,
          height: 60,
          rotation: 20,
          opacity: 0.25,
          overflow: 'clip',
          layout: { mode: 'grid', columns: [100], rows: [40] },
          elements: [
            { type: 'rect', id: 'nested', x: 0, y: 0, width: 160, height: 20, fill: '#f00' },
          ],
        }],
      },
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-deck-layout-id="inner"');
    expect(svg).toContain('clip-path="url(#maliang-deck-layout-clip-inner)"');
    expect(svg).toContain('rotate(20 60 30)');
    expect(svg).toContain('opacity="0.25"');
  });
});
