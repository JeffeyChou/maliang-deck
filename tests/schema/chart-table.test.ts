import { describe, expect, it } from 'vitest';
import { validateDeck, type Deck } from '@maliang-deck/schema';

const validDeck = (element: Deck['slides'][number]['elements'][number]): Deck => ({
  meta: {
    title: 'Chart and table schema test',
    canvas: { width: 1280, height: 720 },
  },
  slides: [
    {
      id: 'slide-1',
      elements: [element],
    },
  ],
});

describe('chart/table schema validation', () => {
  it.each(['bar', 'line', 'pie', 'doughnut'] as const)(
    'accepts a valid %s chart element',
    (chartType) => {
      const result = validateDeck(
        validDeck({
          type: 'chart',
          id: `${chartType}-chart`,
          x: 80,
          y: 60,
          width: 480,
          height: 320,
          chartType,
          data: [
            {
              name: 'Revenue',
              labels: ['Q1', 'Q2', 'Q3'],
              values: [10, 20, 30],
            },
          ],
          options: { showLegend: true },
        }),
      );

      expect(result.success).toBe(true);
    },
  );

  it('accepts a valid table element with primitive and object cells', () => {
    const result = validateDeck(
      validDeck({
        type: 'table',
        id: 'summary-table',
        x: 100,
        y: 120,
        width: 720,
        rows: [
          [{ text: 'Metric', options: { bold: true } }, 'Value'],
          ['Revenue', 1200],
          ['Profitable', true],
          ['Notes', null],
        ],
        options: { border: { type: 'solid', color: '666666' } },
      }),
    );

    expect(result.success).toBe(true);
  });

  it('accepts chart/table elements nested inside groups', () => {
    const result = validateDeck(
      validDeck({
        type: 'group',
        id: 'group-1',
        x: 0,
        y: 0,
        elements: [
          {
            type: 'chart',
            id: 'nested-chart',
            x: 10,
            y: 20,
            width: 320,
            height: 240,
            chartType: 'line',
            data: [{ labels: [2024, 2025], values: [42, 84] }],
          },
          {
            type: 'table',
            id: 'nested-table',
            x: 360,
            y: 20,
            width: 240,
            rows: [['A', 'B']],
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
  });

  it.each([
    {
      name: 'missing chartType',
      element: {
        type: 'chart',
        id: 'missing-chart-type',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        data: [{ labels: ['A'], values: [1] }],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'chartType'],
    },
    {
      name: 'empty chart data',
      element: {
        type: 'chart',
        id: 'empty-chart-data',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'bar',
        data: [],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'data'],
    },
    {
      name: 'missing series labels',
      element: {
        type: 'chart',
        id: 'missing-labels',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'bar',
        data: [{ values: [1] }],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'data', 0, 'labels'],
    },
    {
      name: 'missing series values',
      element: {
        type: 'chart',
        id: 'missing-values',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'bar',
        data: [{ labels: ['A'] }],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'data', 0, 'values'],
    },
    {
      name: 'mismatched labels and values',
      element: {
        type: 'chart',
        id: 'mismatched-series',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'bar',
        data: [{ labels: ['A', 'B'], values: [1] }],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'data', 0, 'values'],
    },
    {
      name: 'unsupported scatter chart type',
      element: {
        type: 'chart',
        id: 'scatter-chart',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'scatter',
        data: [{ labels: ['A'], values: [1] }],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'chartType'],
    },
    {
      name: 'empty table rows',
      element: {
        type: 'table',
        id: 'empty-table',
        x: 0,
        y: 0,
        width: 400,
        rows: [],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'rows'],
    },
    {
      name: 'invalid table row shape',
      element: {
        type: 'table',
        id: 'invalid-table-row',
        x: 0,
        y: 0,
        width: 400,
        rows: ['not-a-row'],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'rows', 0],
    },
    {
      name: 'missing table width',
      element: {
        type: 'table',
        id: 'missing-table-width',
        x: 0,
        y: 0,
        rows: [['A']],
      },
      expectedPath: ['slides', 0, 'elements', 0, 'width'],
    },
  ])('rejects invalid chart/table element: $name', ({ element, expectedPath }) => {
    const result = validateDeck(validDeck(element as Deck['slides'][number]['elements'][number]));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: expectedPath,
        }),
      );
    }
  });
});
