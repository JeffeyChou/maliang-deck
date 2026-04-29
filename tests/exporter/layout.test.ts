import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function writeDeck(deck: Deck): { dir: string; deckPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-layout-export-'));
  const deckPath = join(dir, 'deck.json');
  writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');
  return { dir, deckPath };
}

const layoutDeck: Deck = {
  meta: { title: 'layout export', canvas: { width: 1280, height: 720 } },
  slides: [{
    id: 'slide-1',
    elements: [{
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
    }],
  }],
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
      elements: [{
        type: 'group',
        id: 'nested-group',
        x: 0,
        y: 0,
        elements: [
          { type: 'chart', id: 'nested-chart', x: 0, y: 0, width: 240, height: 120, chartType: 'bar', data: [{ labels: ['A'], values: [1] }] },
        ],
      }],
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

  it('passes chart/table elements nested inside layout to DrawingML export', () => {
    const { dir, deckPath } = writeDeck(nestedChartDeck);
    let pythonBridgeCalls = 0;
    try {
      const result = exportDeck(
        { deckPath, outputPath: join(dir, 'deck.pptx'), format: 'pptx' },
        { runPythonBridge: () => { pythonBridgeCalls += 1; } },
      );

      expect(result.success).toBe(true);
      expect(pythonBridgeCalls).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
