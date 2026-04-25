import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '../../packages/renderer-html/src/index.js';
import type { Deck, Element } from '../../packages/schema/src/index.js';

function deckWith(elements: Element[]): Deck {
  return {
    meta: { title: 'HTML chart/table rendering', canvas: { width: 960, height: 540 } },
    slides: [{ id: 'slide-1', elements }],
  };
}

describe('HTML chart/table renderer', () => {
  it('renders table primitive and object cells with escaped text and stable ragged rows', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'table',
        id: 'summary-table',
        x: 24,
        y: 32,
        width: 420,
        height: 180,
        rows: [
          [{ text: 'Metric <unsafe>', options: { bold: true, fill: '#e0f2fe', color: '#0369a1' } }, 'Value'],
          ['Revenue & profit', 42, true],
          ['Notes', null],
        ],
        options: { border: { type: 'solid' }, unsupportedPowerPointOption: true },
      },
    ]));

    expect(html).toContain('id="summary-table"');
    expect(html).toContain('data-maliang-deck-element="table"');
    expect(html).toContain('<table');
    expect(html).toContain('left: 24px');
    expect(html).toContain('width: 420px');
    expect(html).toContain('Metric &lt;unsafe&gt;');
    expect(html).toContain('Revenue &amp; profit');
    expect(html).toContain('true');
    expect(html).toContain('font-weight: 700');
    expect(html).toContain('data-maliang-deck-ignored-options="border,unsupportedPowerPointOption"');

    const rowCount = (html.match(/<tr>/g) ?? []).length;
    const cellCount = (html.match(/<td /g) ?? []).length;
    expect(rowCount).toBe(3);
    expect(cellCount).toBe(9);
    expect(html).toContain('<td style="border: 1px solid var(--table-border, #cbd5e1); padding: 6px 8px');
  });

  it('renders bar and line charts with all series and deterministic data attributes', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'chart',
        id: 'bar-chart',
        x: 40,
        y: 40,
        width: 360,
        height: 220,
        chartType: 'bar',
        data: [
          { name: 'Revenue <A>', labels: ['Q1', 'Q2', 'Q3'], values: [10, 0, -4] },
          { name: 'Costs', labels: ['Q1', 'Q2', 'Q3'], values: [6, 8, 5] },
        ],
        options: { showLegend: true },
      },
      {
        type: 'chart',
        id: 'line-chart',
        x: 420,
        y: 40,
        width: 360,
        height: 220,
        chartType: 'line',
        data: [
          { name: 'Actual', labels: [2024, 2025, 2026], values: [-2, 0, 12] },
          { name: 'Forecast', labels: [2024, 2025, 2026], values: [3, 9, 15] },
        ],
        options: { showValue: true },
      },
    ]));

    expect(html).toContain('id="bar-chart"');
    expect(html).toContain('data-maliang-deck-chart-type="bar"');
    expect(html).toContain('data-maliang-deck-ignored-options="showLegend"');
    expect(html).toContain('Revenue &lt;A&gt;');
    expect(html).toContain('data-series="Revenue &lt;A&gt;"');
    expect(html).toContain('data-series="Costs"');
    expect(html).toContain('data-value="-4"');
    expect(html).toContain('data-value="0"');
    expect(html).toContain('<rect');

    expect(html).toContain('id="line-chart"');
    expect(html).toContain('data-maliang-deck-chart-type="line"');
    expect(html).toContain('<polyline');
    expect(html).toContain('data-series="Actual"');
    expect(html).toContain('data-series="Forecast"');
    expect(html).toContain('data-maliang-deck-chart-data-label="true"');
    expect(html).toContain('data-value="15">15</text>');
    expect(html).toContain('2026');
  });

  it('renders pie and doughnut charts using the first series and safe fallbacks for invalid static slices', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'chart',
        id: 'pie-chart',
        x: 20,
        y: 20,
        width: 320,
        height: 220,
        chartType: 'pie',
        data: [
          { name: 'Share', labels: ['A&B', 'B'], values: [30, 70] },
          { name: 'Ignored', labels: ['C'], values: [100] },
        ],
      },
      {
        type: 'chart',
        id: 'empty-doughnut',
        x: 360,
        y: 20,
        width: 320,
        height: 220,
        chartType: 'doughnut',
        data: [{ name: 'Empty', labels: ['None', 'Also none'], values: [0, 0] }],
      },
      {
        type: 'chart',
        id: 'negative-pie',
        x: 700,
        y: 20,
        width: 240,
        height: 220,
        chartType: 'pie',
        data: [{ labels: ['Loss'], values: [-1] }],
      },
    ]));

    expect(html).toContain('id="pie-chart"');
    expect(html).toContain('data-maliang-deck-ignored-series-count="1"');
    expect(html).toContain('A&amp;B');
    expect(html).toContain('<path');
    expect(html).not.toContain('Ignored:');

    expect(html).toContain('id="empty-doughnut"');
    expect(html).toContain('doughnut chart has no positive values to render.');
    expect(html).toContain('id="negative-pie"');
    expect(html).toContain('pie charts cannot render negative values');
  });

  it('renders chart and table elements nested inside groups without unsupported-element throws', () => {
    const html = renderDeckToHtml(deckWith([
      {
        type: 'group',
        id: 'analytics-group',
        x: 80,
        y: 90,
        width: 600,
        height: 320,
        elements: [
          {
            type: 'chart',
            id: 'nested-chart',
            x: 10,
            y: 20,
            width: 260,
            height: 160,
            chartType: 'bar',
            data: [{ labels: ['One'], values: [1] }],
          },
          {
            type: 'table',
            id: 'nested-table',
            x: 300,
            y: 20,
            width: 220,
            rows: [['Name', 'Value'], [{ text: 'Escaped "quote"' }, '<ok>']],
          },
        ],
      },
    ]));

    expect(html).toContain('id="analytics-group"');
    expect(html).toContain('id="nested-chart"');
    expect(html).toContain('id="nested-table"');
    expect(html).toContain('Escaped &quot;quote&quot;');
    expect(html).toContain('&lt;ok&gt;');
  });
});
