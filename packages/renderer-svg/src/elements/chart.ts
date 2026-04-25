import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { ChartElement, ChartSeries } from '../../../schema/src/types.js';
import { buildOpacityAttrs, buildTransform, escapeXml, n } from '../utils.js';
import type { RenderResult } from './index.js';

const PALETTE = ['#3366ff', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'];
const MARGIN = { top: 22, right: 18, bottom: 34, left: 42 };

export function renderChart(el: ChartElement): RenderResult {
  const warnings = chartWarnings(el);
  const transform = buildTransform(el);
  const opacityAttrs = buildOpacityAttrs(el.opacity);
  const attrs = [
    `data-maliang-deck-id="${escapeXml(el.id)}"`,
    `data-maliang-deck-kind="chart"`,
    `data-chart-type="${el.chartType}"`,
    opacityAttrs,
    transform ? `transform="${transform}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const body = el.chartType === 'bar'
    ? renderBarChart(el)
    : el.chartType === 'line'
      ? renderLineChart(el)
      : renderPieLikeChart(el, el.chartType === 'doughnut');

  return {
    svg: `<g ${attrs}>\n${renderFrame(el)}\n${body}\n</g>`,
    warnings,
  };
}

function chartWarnings(el: ChartElement): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];

  if (el.options && Object.keys(el.options).length > 0) {
    warnings.push({
      type: 'unsupported-feature',
      elementId: el.id,
      message: `SVG chart renderer ignores PowerPoint-specific chart options for "${el.id}".`,
    });
  }

  if ((el.chartType === 'pie' || el.chartType === 'doughnut') && el.data.length > 1) {
    warnings.push({
      type: 'chart-degraded',
      elementId: el.id,
      message: `SVG ${el.chartType} chart "${el.id}" renders only the first data series.`,
    });
  }

  if ((el.chartType === 'pie' || el.chartType === 'doughnut') && firstSeriesValues(el).some((value) => value < 0)) {
    warnings.push({
      type: 'chart-degraded',
      elementId: el.id,
      message: `SVG ${el.chartType} chart "${el.id}" cannot render negative slice values and uses an empty-state fallback.`,
    });
  }

  return warnings;
}

function renderFrame(el: ChartElement): string {
  return `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}" fill="#ffffff" stroke="#d0d7de" stroke-width="1"/>`;
}

function renderBarChart(el: ChartElement): string {
  const plot = plotArea(el);
  const labels = seriesLabels(el);
  const domain = valueDomain(el.data);
  const baseline = scaleY(0, domain, plot);
  const groupWidth = plot.width / Math.max(labels.length, 1);
  const seriesCount = Math.max(el.data.length, 1);
  const barWidth = Math.max(2, (groupWidth * 0.72) / seriesCount);
  const showDataLabels = hasVisibleDataLabels(el);
  const bars: string[] = [];

  labels.forEach((label, labelIndex) => {
    el.data.forEach((series, seriesIndex) => {
      const value = series.values[labelIndex] ?? 0;
      const x = plot.x + labelIndex * groupWidth + groupWidth * 0.14 + seriesIndex * barWidth;
      const y = scaleY(value, domain, plot);
      const height = Math.abs(baseline - y);
      const barY = Math.min(y, baseline);
      const seriesName = series.name ?? `Series ${seriesIndex + 1}`;
      const valueLabelY = value >= 0 ? barY - 4 : barY + height + 12;
      bars.push(`<rect x="${n(x)}" y="${n(barY)}" width="${n(barWidth * 0.86)}" height="${n(height)}" fill="${PALETTE[seriesIndex % PALETTE.length]}" data-series="${escapeXml(seriesName)}" data-label="${escapeXml(String(label))}" data-value="${n(value)}"/>`);
      if (showDataLabels) {
        bars.push(dataLabelText(value, x + (barWidth * 0.86) / 2, valueLabelY, seriesName, label, '#57606a'));
      }
    });

    bars.push(labelText(label, plot.x + labelIndex * groupWidth + groupWidth / 2, el.y + el.height - 10, 'middle'));
  });

  return [
    axes(plot, baseline),
    ...bars,
    ...legend(el.data, el.x + MARGIN.left, el.y + 16),
  ].join('\n');
}

function renderLineChart(el: ChartElement): string {
  const plot = plotArea(el);
  const labels = seriesLabels(el);
  const domain = valueDomain(el.data);
  const baseline = scaleY(0, domain, plot);
  const step = labels.length > 1 ? plot.width / (labels.length - 1) : 0;
  const showDataLabels = hasVisibleDataLabels(el);
  const parts: string[] = [axes(plot, baseline)];

  labels.forEach((label, labelIndex) => {
    parts.push(labelText(label, plot.x + labelIndex * step, el.y + el.height - 10, 'middle'));
  });

  el.data.forEach((series, seriesIndex) => {
    const color = PALETTE[seriesIndex % PALETTE.length];
    const seriesName = series.name ?? `Series ${seriesIndex + 1}`;
    const points = series.values.map((value, valueIndex) => (
      `${n(plot.x + valueIndex * step)},${n(scaleY(value, domain, plot))}`
    ));
    if (points.length > 1) {
      parts.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" data-series="${escapeXml(seriesName)}"/>`);
    }
    series.values.forEach((value, valueIndex) => {
      const label = series.labels[valueIndex] ?? valueIndex + 1;
      const x = plot.x + valueIndex * step;
      const y = scaleY(value, domain, plot);
      parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="3" fill="${color}" data-series="${escapeXml(seriesName)}" data-label="${escapeXml(String(label))}" data-value="${n(value)}"/>`);
      if (showDataLabels) {
        parts.push(dataLabelText(value, x, y - 7, seriesName, label, '#57606a'));
      }
    });
  });

  parts.push(...legend(el.data, el.x + MARGIN.left, el.y + 16));
  return parts.join('\n');
}

function renderPieLikeChart(el: ChartElement, doughnut: boolean): string {
  const values = firstSeriesValues(el);
  const labels = el.data[0]?.labels ?? [];
  const seriesName = el.data[0]?.name ?? 'Series 1';
  const hasNegative = values.some((value) => value < 0);
  const positiveValues = values.filter((value) => value > 0);
  const total = positiveValues.reduce((sum, value) => sum + value, 0);
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const radius = Math.max(6, Math.min(el.width - MARGIN.left - MARGIN.right, el.height - MARGIN.top - MARGIN.bottom) / 2);
  const showDataLabels = hasVisibleDataLabels(el);

  if (hasNegative || total <= 0) {
    return [
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(radius)}" fill="#f3f6fb" stroke="#d0d7de" stroke-width="1"/>`,
      doughnut ? `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(radius * 0.52)}" fill="#ffffff"/>` : '',
      `<text x="${n(cx)}" y="${n(cy + 5)}" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#57606a">No positive data</text>`,
    ].filter(Boolean).join('\n');
  }

  let angle = -90;
  const parts: string[] = [];
  values.forEach((rawValue, index) => {
    const value = Math.max(0, rawValue);
    if (value === 0) return;
    const sweep = (value / total) * 360;
    const color = PALETTE[index % PALETTE.length];
    const label = labels[index] ?? index + 1;
    if (sweep >= 359.999) {
      parts.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(radius)}" fill="${color}" data-series="${escapeXml(seriesName)}" data-label="${escapeXml(String(label))}" data-value="${n(value)}"/>`);
    } else {
      parts.push(`<path d="${wedgePath(cx, cy, radius, angle, angle + sweep, doughnut ? radius * 0.55 : 0)}" fill="${color}" stroke="#ffffff" stroke-width="1" data-series="${escapeXml(seriesName)}" data-label="${escapeXml(String(label))}" data-value="${n(value)}"/>`);
    }
    if (showDataLabels) {
      const labelPoint = polar(cx, cy, radius * (doughnut ? 0.78 : 0.62), angle + sweep / 2);
      parts.push(dataLabelText(value, labelPoint.x, labelPoint.y + 3, seriesName, label, '#ffffff'));
    }
    angle += sweep;
  });

  if (doughnut && values.filter((value) => value > 0).length === 1) {
    parts.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(radius * 0.55)}" fill="#ffffff"/>`);
  }

  parts.push(...legend([{ labels, values }], el.x + MARGIN.left, el.y + 16));
  return parts.join('\n');
}

function plotArea(el: ChartElement): { x: number; y: number; width: number; height: number } {
  return {
    x: el.x + MARGIN.left,
    y: el.y + MARGIN.top,
    width: Math.max(1, el.width - MARGIN.left - MARGIN.right),
    height: Math.max(1, el.height - MARGIN.top - MARGIN.bottom),
  };
}

function seriesLabels(el: ChartElement): Array<string | number> {
  const longest = el.data.reduce<ChartSeries | undefined>((current, series) => (
    !current || series.labels.length > current.labels.length ? series : current
  ), undefined);
  return longest?.labels ?? [];
}

function firstSeriesValues(el: ChartElement): number[] {
  return el.data[0]?.values ?? [];
}

function valueDomain(series: ChartSeries[]): { min: number; max: number } {
  const values = series.flatMap((item) => item.values);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function hasVisibleDataLabels(el: ChartElement): boolean {
  return el.options?.showValue === true || el.options?.showDataLabels === true || el.options?.dataLabels === true;
}

function scaleY(value: number, domain: { min: number; max: number }, plot: { y: number; height: number }): number {
  const ratio = (value - domain.min) / (domain.max - domain.min);
  return plot.y + plot.height - ratio * plot.height;
}

function axes(plot: { x: number; y: number; width: number; height: number }, baseline: number): string {
  return [
    `<line x1="${n(plot.x)}" y1="${n(plot.y)}" x2="${n(plot.x)}" y2="${n(plot.y + plot.height)}" stroke="#8c959f" stroke-width="1"/>`,
    `<line x1="${n(plot.x)}" y1="${n(baseline)}" x2="${n(plot.x + plot.width)}" y2="${n(baseline)}" stroke="#8c959f" stroke-width="1"/>`,
  ].join('\n');
}

function labelText(label: string | number, x: number, y: number, anchor: 'start' | 'middle'): string {
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-size="11" font-family="sans-serif" fill="#57606a">${escapeXml(String(label))}</text>`;
}

function dataLabelText(value: number, x: number, y: number, seriesName: string, label: string | number, fill: string): string {
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="700" fill="${fill}" data-maliang-deck-chart-data-label="true" data-series="${escapeXml(seriesName)}" data-label="${escapeXml(String(label))}" data-value="${n(value)}">${escapeXml(n(value))}</text>`;
}

function legend(series: ChartSeries[], x: number, y: number): string[] {
  return series.map((item, index) => {
    const label = item.name ?? String(item.labels[index] ?? `Series ${index + 1}`);
    const rowY = y + index * 16;
    return [
      `<rect x="${n(x + index * 120)}" y="${n(rowY - 10)}" width="10" height="10" fill="${PALETTE[index % PALETTE.length]}"/>`,
      `<text x="${n(x + 14 + index * 120)}" y="${n(rowY)}" font-size="11" font-family="sans-serif" fill="#24292f">${escapeXml(label)}</text>`,
    ].join('\n');
  });
}

function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, innerR: number): string {
  const startOuter = polar(cx, cy, r, startAngle);
  const endOuter = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  if (innerR <= 0) {
    return [
      `M ${n(cx)} ${n(cy)}`,
      `L ${n(startOuter.x)} ${n(startOuter.y)}`,
      `A ${n(r)} ${n(r)} 0 ${largeArc} 1 ${n(endOuter.x)} ${n(endOuter.y)}`,
      'Z',
    ].join(' ');
  }

  const startInner = polar(cx, cy, innerR, startAngle);
  const endInner = polar(cx, cy, innerR, endAngle);
  return [
    `M ${n(startOuter.x)} ${n(startOuter.y)}`,
    `A ${n(r)} ${n(r)} 0 ${largeArc} 1 ${n(endOuter.x)} ${n(endOuter.y)}`,
    `L ${n(endInner.x)} ${n(endInner.y)}`,
    `A ${n(innerR)} ${n(innerR)} 0 ${largeArc} 0 ${n(startInner.x)} ${n(startInner.y)}`,
    'Z',
  ].join(' ');
}

function polar(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}
