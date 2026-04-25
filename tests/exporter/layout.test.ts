import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import { renderDeck } from '../../packages/exporter-pptxgenjs/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function writeDeck(deck: Deck): { dir: string; deckPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-layout-export-'));
  const deckPath = join(dir, 'deck.json');
  writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');
  return { dir, deckPath };
}

const layoutDeck: Deck = {
  meta: { title: 'layout export', canvas: { width: 1280, height: 720 } },
  slides: [
    {
      id: 'slide-1',
      elements: [
        {
          type: 'layout',
          id: 'layout-1',
          x: 100,
          y: 80,
          width: 500,
          height: 200,
          layout: { mode: 'grid', columns: [200, 200], rows: [80], gap: 20, padding: 10 },
          elements: [
            { type: 'rect', id: 'box', x: 0, y: 0, width: 80, height: 40, fill: '#58a6ff' },
          ],
        },
      ],
    },
  ],
};

const nestedChartDeck: Deck = {
  ...layoutDeck,
  slides: [{
    id: 'slide-1',
    elements: [{
      type: 'layout',
      id: 'layout-chart',
      x: 0,
      y: 0,
      width: 640,
      height: 320,
      layout: { mode: 'grid', columns: [300], rows: [200] },
      elements: [
        { type: 'group', id: 'nested-group', x: 0, y: 0, elements: [
          { type: 'chart', id: 'nested-chart', x: 0, y: 0, width: 240, height: 120, chartType: 'bar', data: [{ labels: ['A'], values: [1] }] },
        ] },
      ],
    }],
  }],
};

describe('layout export behavior', () => {
  it('propagates layout diagnostics through the default PDF/PPTX export path', () => {
    const { dir, deckPath } = writeDeck(layoutDeck);
    try {
      const result = exportDeck(
        { deckPath, outputPath: join(dir, 'deck.pdf'), format: 'pdf' },
        { runPythonBridge: () => undefined },
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(expect.objectContaining({
        code: 'svg-layout-flattened',
        detail: expect.objectContaining({ elementId: 'layout-1', path: expect.any(String) }),
      }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails fast for chart/table elements nested inside layout on the default DrawingML path', () => {
    const { dir, deckPath } = writeDeck(nestedChartDeck);
    try {
      const result = exportDeck(
        { deckPath, outputPath: join(dir, 'deck.pptx'), format: 'pptx' },
        { runPythonBridge: () => { throw new Error('python bridge must not run'); } },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('chart#nested-chart at slides[0].elements[0].elements[0].elements[0]');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('renders layout contents through explicit pptxgenjs by resolving layout first', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const slide = { addShape: (...args: unknown[]) => calls.push({ method: 'addShape', args }) };
    const pptx = { ShapeType: { rect: 'RECT' }, addSlide: () => slide };

    renderDeck(layoutDeck, pptx as never);

    expect(calls).toContainEqual(expect.objectContaining({
      method: 'addShape',
      args: ['RECT', expect.objectContaining({ x: 1.1458, y: 0.9375, w: 0.8333, h: 0.4167 })],
    }));
  });

  it('warns when explicit pptxgenjs cannot preserve layout-level export effects', () => {
    const deck: Deck = {
      ...layoutDeck,
      slides: [{
        id: 'slide-1',
        elements: [{
          ...layoutDeck.slides[0].elements[0],
          rotation: 10,
          opacity: 0.4,
          overflow: 'clip',
        }],
      }],
    };
    const slide = { addShape: () => undefined };
    const pptx = { ShapeType: { rect: 'RECT' }, addSlide: () => slide };
    const warnings: unknown[] = [];

    renderDeck(deck, pptx as never, { warnings: warnings as never });

    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'pptxgenjs.layout.transform-unsupported' }),
      expect.objectContaining({ code: 'pptxgenjs.layout.opacity-unsupported' }),
      expect.objectContaining({ code: 'pptxgenjs.layout.clip-unsupported' }),
    ]));
  });

  it('warns for unsupported nested layout-level effects in explicit pptxgenjs', () => {
    const deck: Deck = {
      ...layoutDeck,
      slides: [{
        id: 'slide-1',
        elements: [{
          type: 'layout',
          id: 'outer',
          x: 0,
          y: 0,
          width: 500,
          height: 200,
          layout: { mode: 'grid', columns: [240], rows: [120] },
          elements: [{
            type: 'layout',
            id: 'inner',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            rotation: 10,
            opacity: 0.4,
            overflow: 'clip',
            layout: { mode: 'grid', columns: [100], rows: [80] },
            elements: [
              { type: 'rect', id: 'nested-box', x: 0, y: 0, width: 80, height: 40, fill: '#58a6ff' },
            ],
          }],
        }],
      }],
    };
    const slide = { addShape: () => undefined };
    const pptx = { ShapeType: { rect: 'RECT' }, addSlide: () => slide };
    const warnings: unknown[] = [];

    renderDeck(deck, pptx as never, { warnings: warnings as never });

    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'pptxgenjs.layout.transform-unsupported', detail: expect.objectContaining({ elementId: 'inner' }) }),
      expect.objectContaining({ code: 'pptxgenjs.layout.opacity-unsupported', detail: expect.objectContaining({ elementId: 'inner' }) }),
      expect.objectContaining({ code: 'pptxgenjs.layout.clip-unsupported', detail: expect.objectContaining({ elementId: 'inner' }) }),
    ]));
  });
});
