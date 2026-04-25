import { describe, expect, it } from 'vitest';
import { renderDeckToSvg } from '../../packages/renderer-svg/src/index.js';
import type { ChartElement, Deck, Element, TableElement } from '../../packages/schema/src/index.js';

const baseTable: TableElement = {
  type: 'table',
  id: 'summary-table',
  x: 40,
  y: 40,
  width: 360,
  height: 120,
  rows: [
    [{ text: 'Metric', options: { bold: true } }, 'Value'],
    [{ text: 'Revenue <net>', options: { fill: '#fee2e2', color: '#991b1b', italic: true, align: 'right' } }, 42],
    ['Missing value'],
  ],
  options: { border: { color: '666666' } },
};

function chart(chartType: ChartElement['chartType'], overrides: Partial<ChartElement> = {}): ChartElement {
  return {
    type: 'chart',
    id: `${chartType}-chart`,
    x: 60,
    y: 80,
    width: 420,
    height: 260,
    chartType,
    data: [
      { name: 'Revenue', labels: ['Q1', 'Q2', 'Q3'], values: [10, -4, 18] },
      { name: 'Cost', labels: ['Q1', 'Q2', 'Q3'], values: [5, 7, 9] },
    ],
    ...overrides,
  };
}

function deckWith(elements: Element[]): Deck {
  return {
    meta: { title: 'svg chart-table', canvas: { width: 640, height: 360 } },
    slides: [{ id: 'slide-1', elements }],
  };
}

describe('SVG chart/table rendering', () => {
  it('renders table grids with escaped text, ragged rows, and explicit option warnings', () => {
    const result = renderDeckToSvg(deckWith([baseTable]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-deck-kind="table"');
    expect(svg).toContain('data-maliang-deck-id="summary-table"');
    expect(svg).toContain('Revenue &lt;net&gt;');
    expect(svg).toContain('fill="#fee2e2"');
    expect(svg).toContain('fill="#991b1b"');
    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('text-anchor="end"');
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(result.warnings).toMatchObject([
      {
        type: 'unsupported-feature',
        elementId: 'summary-table',
      },
    ]);
  });

  it.each(['bar', 'line', 'pie', 'doughnut'] as const)('renders visible %s chart primitives', (chartType) => {
    const element = chartType === 'pie' || chartType === 'doughnut'
      ? chart(chartType, { data: [{ name: 'Share', labels: ['A', 'B'], values: [30, 70] }] })
      : chart(chartType);
    const result = renderDeckToSvg(deckWith([element]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-maliang-deck-kind="chart"');
    expect(svg).toContain(`data-chart-type="${chartType}"`);
    expect(svg).toContain(`data-maliang-deck-id="${chartType}-chart"`);
    expect(svg).not.toContain(`data-maliang-deck-id="${chartType}-chart"></g>`);

    if (chartType === 'line') {
      expect(svg).toContain('<polyline ');
    } else if (chartType === 'pie' || chartType === 'doughnut') {
      expect(svg).toMatch(/<(path|circle) /u);
    } else {
      expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThan(2);
    }
  });

  it('renders deterministic chart data attributes and opt-in value labels', () => {
    const result = renderDeckToSvg(deckWith([
      chart('bar', {
        id: 'labeled-chart',
        options: { showValue: true },
      }),
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('data-series="Revenue"');
    expect(svg).toContain('data-label="Q1"');
    expect(svg).toContain('data-value="10"');
    expect(svg).toContain('data-maliang-deck-chart-data-label="true"');
    expect(svg).toContain('>18</text>');
  });

  it('renders chart and table elements inside groups instead of silently dropping them', () => {
    const result = renderDeckToSvg(deckWith([
      {
        type: 'group',
        id: 'nested-group',
        x: 12,
        y: 18,
        elements: [
          chart('bar', { id: 'nested-chart', x: 20, y: 20, width: 220, height: 140 }),
          { ...baseTable, id: 'nested-table', x: 260, y: 20, width: 240, height: 100, options: undefined },
        ],
      },
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('transform="translate(12 18)"');
    expect(svg).toContain('data-maliang-deck-id="nested-chart"');
    expect(svg).toContain('data-maliang-deck-id="nested-table"');
  });

  it('emits chart degradation warnings for multi-series pie charts and fallback states', () => {
    const result = renderDeckToSvg(deckWith([
      chart('pie', {
        id: 'degraded-pie',
        data: [
          { name: 'Invalid', labels: ['Loss', 'Flat'], values: [-1, 0] },
          { name: 'Ignored', labels: ['Other'], values: [1] },
        ],
        options: { showLegend: true },
      }),
    ]));
    const svg = result.slides[0].svg;

    expect(svg).toContain('No positive data');
    expect(result.warnings.map((warning) => warning.type)).toEqual([
      'unsupported-feature',
      'chart-degraded',
      'chart-degraded',
    ]);
  });
});
