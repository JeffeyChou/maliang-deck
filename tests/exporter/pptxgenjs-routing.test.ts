import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { exportDeck } from '../../packages/exporter/src/index.js';
import {
  createCanvasGeometry,
  elementPosition,
  exportDeckWithPptxGenJs,
  normalizeTableRows,
  renderDeck,
} from '../../packages/exporter-pptxgenjs/src/index.js';
import type { Deck } from '../../packages/schema/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, '..', 'fixtures', 'exporter', 'chart-table-deck.json');

function readFixtureDeck(): Deck {
  return JSON.parse(readFileSync(fixturePath, 'utf-8')) as Deck;
}

function writeDeck(dir: string, deck: Deck = readFixtureDeck()): string {
  const deckPath = join(dir, 'deck.json');
  writeFileSync(deckPath, JSON.stringify(deck), 'utf-8');
  return deckPath;
}

function withNestedChartTable(deck: Deck): Deck {
  const [slide] = deck.slides;
  return {
    ...deck,
    slides: [
      {
        ...slide,
        elements: [
          {
            type: 'group',
            id: 'nested-chart-table-group',
            x: 10,
            y: 20,
            elements: slide.elements.filter((element) => element.type === 'chart' || element.type === 'table'),
          },
        ],
      },
    ],
  };
}

describe('pptxgenjs geometry and table normalization', () => {
  it('maps a 1280x720 canvas to a deterministic 16:9 custom layout', () => {
    const geometry = createCanvasGeometry({ width: 1280, height: 720 });

    expect(geometry).toMatchObject({
      widthIn: 13.333333333333332,
      heightIn: 7.5,
      layoutName: 'MALIANG_DECK_1280x720',
    });
    expect(elementPosition({ type: 'rect', id: 'full-slide', x: 0, y: 0, width: 1280, height: 720 }, geometry))
      .toEqual({ x: 0, y: 0, w: 13.3333, h: 7.5 });
    expect(elementPosition({ type: 'rect', id: 'quarter', x: 320, y: 180, width: 640, height: 360 }, geometry))
      .toEqual({ x: 3.3333, y: 1.875, w: 6.6667, h: 3.75 });
  });

  it('normalizes primitive and object table cells without mutating source rows', () => {
    const rows = [
      ['A', 1, true, null],
      [{ text: 'Revenue', options: { bold: true } }, '42'],
    ];

    const normalized = normalizeTableRows(rows);

    expect(normalized).toEqual([
      [{ text: 'A' }, { text: '1' }, { text: 'true' }, { text: '' }],
      [{ text: 'Revenue', options: { bold: true } }, { text: '42' }],
    ]);
    expect(normalized[1][0].options).not.toBe((rows[1][0] as { options: Record<string, unknown> }).options);
    expect(rows[0][3]).toBeNull();
  });
});


describe('pptxgenjs chart/table render mapping', () => {
  it('passes chart data/options and normalized table rows to pptxgenjs primitives', () => {
    const chartData = [{ name: 'Revenue', labels: ['Q1', 'Q2'], values: [12, 18] }];
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const slide = {
      addChart: (...args: unknown[]) => calls.push({ method: 'addChart', args }),
      addTable: (...args: unknown[]) => calls.push({ method: 'addTable', args }),
    };
    const pptx = {
      ChartType: { doughnut: 'DOUGHNUT_CHART' },
      addSlide: () => slide,
    };

    renderDeck(
      {
        meta: { title: 'Mapping', canvas: { width: 1280, height: 720 } },
        slides: [
          {
            id: 'chart-table',
            elements: [
              {
                type: 'chart',
                id: 'share-chart',
                x: 128,
                y: 72,
                width: 256,
                height: 144,
                chartType: 'doughnut',
                data: chartData,
                options: { showLegend: true },
              },
              {
                type: 'table',
                id: 'facts-table',
                x: 640,
                y: 360,
                width: 320,
                height: 144,
                rows: [[{ text: 'Metric', options: { bold: true } }, 'Value'], ['Enabled', true], ['Notes', null]],
                options: { margin: 0.05 },
              },
            ],
          },
        ],
      },
      pptx as never,
    );

    expect(calls).toEqual([
      {
        method: 'addChart',
        args: [
          'DOUGHNUT_CHART',
          chartData,
          { showLegend: true, x: 1.3333, y: 0.75, w: 2.6667, h: 1.5 },
        ],
      },
      {
        method: 'addTable',
        args: [
          [
            [{ text: 'Metric', options: { bold: true } }, { text: 'Value' }],
            [{ text: 'Enabled' }, { text: 'true' }],
            [{ text: 'Notes' }, { text: '' }],
          ],
          { margin: 0.05, x: 6.6667, y: 3.75, w: 3.3333, h: 1.5 },
        ],
      },
    ]);
  });
});

describe('pptxgenjs exporter smoke and routing contract', () => {
  it('writes a PPTX directly through the JS exporter for the chart/table fixture', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-pptxgenjs-smoke-'));
    const outputPath = join(dir, 'chart-table.pptx');

    try {
      const result = await exportDeckWithPptxGenJs({ deck: readFixtureDeck(), outputPath, basePath: dirname(fixturePath) });

      expect(result.success, result.error).toBe(true);
      expect(existsSync(outputPath)).toBe(true);
      expect(statSync(outputPath).size).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('routes explicit pptxgenjs package exports without invoking the Python bridge', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-pptxgenjs-routing-'));
    const deckPath = writeDeck(dir);
    const outputPath = join(dir, 'deck.pptx');
    let jsCalls = 0;
    let pythonCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx', pptxEngine: 'pptxgenjs' },
        {
          exportPptxgenjs: ({ deck, outputPath: routedOutputPath }) => {
            jsCalls += 1;
            expect(deck.slides[0].elements.some((element) => element.type === 'chart')).toBe(true);
            expect(routedOutputPath).toBe(outputPath);
            return { format: 'pptx', outputPath: routedOutputPath, success: true, warnings: [] };
          },
          runPythonBridge: () => {
            pythonCalls += 1;
            throw new Error('Python bridge must not run for explicit pptxgenjs exports');
          },
        },
      );

      expect(result.success).toBe(true);
      expect(jsCalls).toBe(1);
      expect(pythonCalls).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails fast instead of sending chart/table decks through the default DrawingML path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-chart-table-default-failfast-'));
    const deckPath = writeDeck(dir);
    const outputPath = join(dir, 'deck.pptx');
    let pythonCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx' },
        {
          runPythonBridge: () => {
            pythonCalls += 1;
            throw new Error('Python bridge must not run for chart/table decks');
          },
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/chart|table|pptxgenjs|unsupported/i);
      expect(pythonCalls).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('recurses into groups when failing fast on the default DrawingML path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-chart-table-nested-failfast-'));
    const deckPath = writeDeck(dir, withNestedChartTable(readFixtureDeck()));
    const outputPath = join(dir, 'nested.pptx');
    let pythonCalls = 0;

    try {
      const result = exportDeck(
        { deckPath, outputPath, format: 'pptx' },
        {
          runPythonBridge: () => {
            pythonCalls += 1;
            throw new Error('Python bridge must not run for nested chart/table decks');
          },
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/nested-chart-table-group|chart|table|unsupported/i);
      expect(pythonCalls).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
