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

describe('DrawingML chart/table export routing', () => {
  it('routes chart decks through the Python/DrawingML PPTX path', () => {
    const { dir, deckPath } = writeDeck(nestedChartDeck);
    const outputPath = join(dir, 'deck.pptx');
    let pythonBridgeCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx' },
        { runPythonBridge: () => { pythonBridgeCalls += 1; } },
      );

      expect(result.success).toBe(true);
      expect(pythonBridgeCalls).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
