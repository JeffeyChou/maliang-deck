import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

function writeDeck(deck: Deck): { dir: string; deckPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-chart-table-unsupported-'));
  const deckPath = join(dir, 'deck.json');
  writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');
  return { dir, deckPath };
}

const nestedChartDeck: Deck = {
  meta: { title: 'Nested chart', canvas: { width: 1280, height: 720 } },
  slides: [
    {
      id: 'slide-1',
      elements: [
        {
          type: 'group',
          id: 'chart-group',
          x: 0,
          y: 0,
          elements: [
            {
              type: 'chart',
              id: 'revenue-chart',
              x: 120,
              y: 100,
              width: 480,
              height: 260,
              chartType: 'bar',
              data: [{ name: 'Revenue', labels: ['Q1', 'Q2'], values: [10, 12] }],
            },
          ],
        },
      ],
    },
  ],
};

describe('chart/table unsupported export paths', () => {
  it('fails fast for nested chart elements on the default DrawingML/Python PPTX path', () => {
    const { dir, deckPath } = writeDeck(nestedChartDeck);
    const outputPath = join(dir, 'deck.pptx');
    let pythonBridgeCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx' },
        { runPythonBridge: () => { pythonBridgeCalls += 1; } },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('DrawingML/Python PPTX export does not support chart/table elements');
      expect(result.error).toContain('chart#revenue-chart at slides[0].elements[0].elements[0]');
      expect(result.error).toContain('pptxEngine "pptxgenjs"');
      expect(pythonBridgeCalls).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows chart/table decks through the explicit pptxgenjs PPTX path', () => {
    const { dir, deckPath } = writeDeck(nestedChartDeck);
    const outputPath = join(dir, 'deck.pptx');
    let jsExporterCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx', pptxEngine: 'pptxgenjs' },
        {
          exportPptxgenjs: () => {
            jsExporterCalls += 1;
            return { format: 'pptx', outputPath, success: true, warnings: [] };
          },
        },
      );

      expect(result.success).toBe(true);
      expect(jsExporterCalls).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
