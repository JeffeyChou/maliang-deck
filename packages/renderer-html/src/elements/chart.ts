import type { ChartElement, ChartSeries, ChartStyle } from '@maliang-deck/schema';
import { buildBaseStyle, escapeHtml } from '../utils.js';

const PALETTE = [
  'var(--chart-1, #2563eb)',
  'var(--chart-2, #dc2626)',
  'var(--chart-3, #16a34a)',
  'var(--chart-4, #d97706)',
  'var(--chart-5, #7c3aed)',
  'var(--chart-6, #0891b2)',
  'var(--chart-7, #db2777)',
  'var(--chart-8, #65a30d)',
];

const AXIS_COLOR = 'var(--chart-axis, #64748b)';
const GRID_COLOR = 'var(--chart-grid, #e2e8f0)';
const TEXT_COLOR = 'var(--chart-label, #334155)';
const FALLBACK_BG = 'var(--chart-bg, #f8fafc)';

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.abs(value) < 0.0001 ? 0 : value;
  return Number.parseFloat(rounded.toFixed(3)).toString();
}

function labelText(label: string | number): string {
  return String(label);
}

function allValues(series: ChartSeries[]): number[] {
  return series.flatMap((item) => item.values).filter(Number.isFinite);
}

function maxPointCount(series: ChartSeries[]): number {
  return Math.max(...series.map((item) => item.values.length), 1);
}

function labelAt(series: ChartSeries[], index: number): string {
  for (const item of series) {
    if (item.labels[index] != null) return labelText(item.labels[index]);
  }
  return String(index + 1);
}

function hasVisibleDataLabels(el: ChartElement): boolean {
  return el.options?.showValue === true || el.options?.showDataLabels === true || el.options?.dataLabels === true;
}

interface ResolvedChartStyle {
  palette: string[];
  axisColor: string;
  gridColor: string;
  labelColor: string;
  backgroundColor: string;
  strokeWidth: number;
  showLegend: boolean;
  showDataLabels: boolean;
  legendPosition: 'top' | 'bottom' | 'right';
  gridLines: boolean;
  rounded: boolean;
  areaFill: boolean;
}

function resolveChartStyle(el: ChartElement): ResolvedChartStyle {
  const s = el.style as ChartStyle | undefined;
  return {
    palette: s?.palette ?? PALETTE,
    axisColor: s?.axisColor ?? AXIS_COLOR,
    gridColor: s?.gridColor ?? GRID_COLOR,
    labelColor: s?.labelColor ?? TEXT_COLOR,
    backgroundColor: s?.backgroundColor ?? FALLBACK_BG,
    strokeWidth: s?.strokeWidth ?? 2.5,
    showLegend: s?.showLegend ?? true,
    showDataLabels: s?.showDataLabels ?? hasVisibleDataLabels(el),
    legendPosition: s?.legendPosition ?? 'bottom',
    gridLines: s?.gridLines ?? true,
    rounded: s?.rounded ?? false,
    areaFill: s?.areaFill ?? false,
  };
}

function domainFor(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };

  let min = Math.min(...values, 0);
  let max = Math.max(...values, 0);

  if (min === max) {
    if (min === 0) return { min: -1, max: 1 };
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    min -= pad;
    max += pad;
  }

  return { min, max };
}

function yForValue(value: number, min: number, max: number, top: number, height: number): number {
  const ratio = (value - min) / (max - min || 1);
  return top + height - ratio * height;
}

function renderLegend(series: ChartSeries[], palette: string[], labelColor: string): string {
  const items = series
    .map((item, index) => {
      const name = item.name ?? `Series ${index + 1}`;
      const color = palette[index % palette.length];
      return [
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;white-space:nowrap">`,
        `<span aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${color}"></span>`,
        `${escapeHtml(name)}`,
        `</span>`,
      ].join('');
    })
    .join('');

  return `<figcaption style="font:12px sans-serif;color:${labelColor};display:flex;flex-wrap:wrap;gap:2px 0;line-height:1.25">${items}</figcaption>`;
}

function renderAxes(width: number, height: number, min: number, max: number, left: number, top: number, plotW: number, plotH: number, cs: ResolvedChartStyle): string {
  const baselineY = yForValue(0, min, max, top, plotH);
  const parts = [
    `<line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotH}" style="stroke:${cs.axisColor}" stroke-width="1"/>`,
    `<line x1="${left}" y1="${baselineY}" x2="${width - 12}" y2="${baselineY}" style="stroke:${cs.axisColor}" stroke-width="1"/>`,
  ];
  if (cs.gridLines) {
    parts.push(
      `<line x1="${left}" y1="${top}" x2="${width - 12}" y2="${top}" style="stroke:${cs.gridColor}" stroke-width="1"/>`,
      `<line x1="${left}" y1="${height - 26}" x2="${width - 12}" y2="${height - 26}" style="stroke:${cs.gridColor}" stroke-width="1"/>`,
    );
  }
  parts.push(
    `<text x="${left - 4}" y="${top + 4}" text-anchor="end" font-size="10" style="fill:${cs.labelColor}">${escapeHtml(formatNumber(max))}</text>`,
    `<text x="${left - 4}" y="${baselineY + 4}" text-anchor="end" font-size="10" style="fill:${cs.labelColor}">0</text>`,
  );
  return parts.join('\n');
}

function renderBarChart(el: ChartElement): string {
  const cs = resolveChartStyle(el);
  const width = el.width;
  const height = el.height;
  const left = 38;
  const top = 16;
  const bottom = 34;
  const right = 14;
  const plotW = Math.max(1, width - left - right);
  const plotH = Math.max(1, height - top - bottom);
  const values = allValues(el.data);
  const { min, max } = domainFor(values);
  const baselineY = yForValue(0, min, max, top, plotH);
  const pointCount = maxPointCount(el.data);
  const groupW = plotW / pointCount;
  const barW = Math.max(1, (groupW * 0.72) / Math.max(el.data.length, 1));
  const groupInset = (groupW - barW * el.data.length) / 2;
  const rxAttr = cs.rounded ? ' rx="4"' : '';

  const bars = el.data.flatMap((series, seriesIndex) => series.values.flatMap((value, valueIndex) => {
    const x = left + valueIndex * groupW + groupInset + seriesIndex * barW;
    const y = yForValue(value, min, max, top, plotH);
    const barY = Math.min(y, baselineY);
    const barH = Math.abs(baselineY - y);
    const color = cs.palette[seriesIndex % cs.palette.length];
    const label = labelAt(el.data, valueIndex);
    const seriesName = series.name ?? `Series ${seriesIndex + 1}`;
    const valueLabelY = value >= 0 ? barY - 4 : barY + barH + 12;
    const mark = `<rect x="${formatNumber(x)}" y="${formatNumber(barY)}" width="${formatNumber(Math.max(barW - 1, 1))}" height="${formatNumber(barH)}"${rxAttr} style="fill:${color}" data-series="${escapeHtml(seriesName)}" data-label="${escapeHtml(label)}" data-value="${formatNumber(value)}"/>`;
    const valueLabel = cs.showDataLabels
      ? `<text x="${formatNumber(x + barW / 2)}" y="${formatNumber(valueLabelY)}" text-anchor="middle" font-size="10" style="fill:${cs.labelColor}" data-maliang-deck-chart-data-label="true" data-series="${escapeHtml(seriesName)}" data-label="${escapeHtml(label)}" data-value="${formatNumber(value)}">${escapeHtml(formatNumber(value))}</text>`
      : '';
    return [mark, valueLabel].filter(Boolean);
  })).join('\n');

  const labels = Array.from({ length: pointCount }, (_, index) => {
    const x = left + index * groupW + groupW / 2;
    return `<text x="${formatNumber(x)}" y="${height - 10}" text-anchor="middle" font-size="10" style="fill:${cs.labelColor}">${escapeHtml(labelAt(el.data, index))}</text>`;
  }).join('\n');

  return [
    `<svg role="img" aria-label="${escapeHtml(el.chartType)} chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;width:100%;height:100%">`,
    renderAxes(width, height, min, max, left, top, plotW, plotH, cs),
    bars,
    labels,
    `</svg>`,
  ].join('\n');
}

function renderLineChart(el: ChartElement): string {
  const cs = resolveChartStyle(el);
  const width = el.width;
  const height = el.height;
  const left = 38;
  const top = 16;
  const bottom = 34;
  const right = 14;
  const plotW = Math.max(1, width - left - right);
  const plotH = Math.max(1, height - top - bottom);
  const values = allValues(el.data);
  const { min, max } = domainFor(values);
  const pointCount = maxPointCount(el.data);

  const xForIndex = (index: number) => {
    if (pointCount === 1) return left + plotW / 2;
    return left + (index / (pointCount - 1)) * plotW;
  };

  const seriesMarkup = el.data.map((series, seriesIndex) => {
    const color = cs.palette[seriesIndex % cs.palette.length];
    const seriesName = series.name ?? `Series ${seriesIndex + 1}`;
    const points = series.values.map((value, valueIndex) => `${formatNumber(xForIndex(valueIndex))},${formatNumber(yForValue(value, min, max, top, plotH))}`).join(' ');
    const parts: string[] = [];

    if (cs.areaFill) {
      const baseY = yForValue(0, min, max, top, plotH);
      const areaPoints = [
        `${formatNumber(xForIndex(0))},${formatNumber(baseY)}`,
        ...series.values.map((value, vi) => `${formatNumber(xForIndex(vi))},${formatNumber(yForValue(value, min, max, top, plotH))}`),
        `${formatNumber(xForIndex(series.values.length - 1))},${formatNumber(baseY)}`,
      ].join(' ');
      parts.push(`<polygon points="${areaPoints}" style="fill:${color};opacity:0.15" />`);
    }

    parts.push(`<polyline points="${points}" style="fill:none;stroke:${color}" stroke-width="${cs.strokeWidth}" stroke-linejoin="round" stroke-linecap="round" data-series="${escapeHtml(seriesName)}"/>`);

    const markers = series.values.map((value, valueIndex) => {
      const label = series.labels[valueIndex] ?? valueIndex + 1;
      const x = xForIndex(valueIndex);
      const y = yForValue(value, min, max, top, plotH);
      const marker = `<circle cx="${formatNumber(x)}" cy="${formatNumber(y)}" r="3" style="fill:${color}" data-series="${escapeHtml(seriesName)}" data-label="${escapeHtml(labelText(label))}" data-value="${formatNumber(value)}"/>`;
      const valueLabel = cs.showDataLabels
        ? `<text x="${formatNumber(x)}" y="${formatNumber(y - 7)}" text-anchor="middle" font-size="10" style="fill:${cs.labelColor}" data-maliang-deck-chart-data-label="true" data-series="${escapeHtml(seriesName)}" data-label="${escapeHtml(labelText(label))}" data-value="${formatNumber(value)}">${escapeHtml(formatNumber(value))}</text>`
        : '';
      return [marker, valueLabel].filter(Boolean).join('\n');
    }).join('\n');

    parts.push(markers);
    return parts.join('\n');
  }).join('\n');

  const labels = Array.from({ length: pointCount }, (_, index) => `<text x="${formatNumber(xForIndex(index))}" y="${height - 10}" text-anchor="middle" font-size="10" style="fill:${cs.labelColor}">${escapeHtml(labelAt(el.data, index))}</text>`).join('\n');

  return [
    `<svg role="img" aria-label="${escapeHtml(el.chartType)} chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;width:100%;height:100%">`,
    renderAxes(width, height, min, max, left, top, plotW, plotH, cs),
    seriesMarkup,
    labels,
    `</svg>`,
  ].join('\n');
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  const radians = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${formatNumber(cx)} ${formatNumber(cy)} L ${formatNumber(start.x)} ${formatNumber(start.y)} A ${formatNumber(radius)} ${formatNumber(radius)} 0 ${largeArcFlag} 0 ${formatNumber(end.x)} ${formatNumber(end.y)} Z`;
}

function renderFallback(message: string, el: ChartElement): string {
  return [
    `<div role="img" aria-label="${escapeHtml(el.chartType)} chart fallback" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;background:${FALLBACK_BG};border:1px dashed ${AXIS_COLOR};color:${TEXT_COLOR};font:13px sans-serif;padding:12px">`,
    escapeHtml(message),
    `</div>`,
  ].join('');
}

function renderPieLikeChart(el: ChartElement): string {
  const cs = resolveChartStyle(el);
  const series = el.data[0];
  const values = series.values;
  const hasNegative = values.some((value) => value < 0);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (hasNegative) {
    return renderFallback(`${el.chartType} charts cannot render negative values in the static HTML renderer.`, el);
  }

  if (total <= 0) {
    return renderFallback(`${el.chartType} chart has no positive values to render.`, el);
  }

  const width = el.width;
  const height = el.height;
  const legendW = cs.showLegend ? Math.min(150, Math.max(90, width * 0.32)) : 0;
  const chartW = Math.max(1, width - legendW);
  const cx = chartW / 2;
  const cy = height / 2;
  const radius = Math.max(1, Math.min(chartW, height) / 2 - 10);
  let angle = 0;

  const slices = values.map((value, index) => {
    const fraction = value / total;
    const endAngle = angle + fraction * 360;
    const color = cs.palette[index % cs.palette.length];
    const label = labelText(series.labels[index]);
    const mid = polarToCartesian(cx, cy, radius * (el.chartType === 'doughnut' ? 0.78 : 0.62), angle + (endAngle - angle) / 2);
    const markup = fraction >= 0.9999
      ? `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius)}" style="fill:${color}" data-series="${escapeHtml(series.name ?? 'Series 1')}" data-label="${escapeHtml(label)}" data-value="${formatNumber(value)}"/>`
      : `<path d="${arcPath(cx, cy, radius, angle, endAngle)}" style="fill:${color}" data-series="${escapeHtml(series.name ?? 'Series 1')}" data-label="${escapeHtml(label)}" data-value="${formatNumber(value)}"/>`;
    const valueLabel = cs.showDataLabels
      ? `<text x="${formatNumber(mid.x)}" y="${formatNumber(mid.y + 3)}" text-anchor="middle" font-size="10" font-weight="700" style="fill:#ffffff" data-maliang-deck-chart-data-label="true" data-series="${escapeHtml(series.name ?? 'Series 1')}" data-label="${escapeHtml(label)}" data-value="${formatNumber(value)}">${escapeHtml(formatNumber(value))}</text>`
      : '';
    angle = endAngle;
    return [markup, valueLabel].filter(Boolean).join('\n');
  }).join('\n');

  const doughnutHole = el.chartType === 'doughnut'
    ? `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius * 0.55)}" style="fill:var(--chart-bg, white)" aria-hidden="true"/>`
    : '';

  const legendPanel = cs.showLegend ? (() => {
    const legend = values.map((value, index) => {
      const color = cs.palette[index % cs.palette.length];
      const label = labelText(series.labels[index]);
      return [
        `<div style="display:flex;align-items:center;gap:5px;min-width:0">`,
        `<span aria-hidden="true" style="width:10px;height:10px;background:${color};border-radius:2px;flex:0 0 auto"></span>`,
        `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}: ${escapeHtml(formatNumber(value))}</span>`,
        `</div>`,
      ].join('');
    }).join('');
    return `<div style="width:${legendW}px;font:11px sans-serif;color:${cs.labelColor};display:flex;flex-direction:column;gap:4px;line-height:1.2">${legend}</div>`;
  })() : '';

  return [
    `<div style="display:flex;width:100%;height:100%;align-items:center">`,
    `<svg role="img" aria-label="${escapeHtml(el.chartType)} chart" width="${chartW}" height="${height}" viewBox="0 0 ${chartW} ${height}" style="display:block;flex:1 1 auto;height:100%">`,
    slices,
    doughnutHole,
    `</svg>`,
    legendPanel,
    `</div>`,
  ].join('\n');
}

function renderChartBody(el: ChartElement): string {
  switch (el.chartType) {
    case 'bar':
      return renderBarChart(el);
    case 'line':
      return renderLineChart(el);
    case 'pie':
    case 'doughnut':
      return renderPieLikeChart(el);
    default:
      throw new Error(`Unsupported chart type: ${(el as { chartType: string }).chartType}`);
  }
}

function ignoredOptionsAttr(options: Record<string, unknown> | undefined): string {
  const keys = Object.keys(options ?? {});
  return keys.length > 0 ? ` data-maliang-deck-ignored-options="${escapeHtml(keys.join(','))}"` : '';
}

export function renderChart(el: ChartElement): string {
  const cs = resolveChartStyle(el);
  const style = buildBaseStyle(el, [
    `margin: 0`,
    `overflow: hidden`,
    `font-family: sans-serif`,
    `color: ${cs.labelColor}`,
    `background: ${cs.backgroundColor}`,
  ]);
  const ignoredSeriesCount = el.chartType === 'pie' || el.chartType === 'doughnut'
    ? Math.max(0, el.data.length - 1)
    : 0;
  const ignoredSeriesAttr = ignoredSeriesCount > 0
    ? ` data-maliang-deck-ignored-series-count="${ignoredSeriesCount}"`
    : '';

  const isPieLike = el.chartType === 'pie' || el.chartType === 'doughnut';
  // For pie/doughnut the legend panel is rendered inside renderPieLikeChart;
  // for bar/line we render it here and respect showLegend.
  const legendMarkup = !isPieLike && cs.showLegend
    ? renderLegend(el.data, cs.palette, cs.labelColor)
    : '';

  return [
    `<figure role="group" aria-label="${escapeHtml(el.chartType)} chart" data-maliang-deck-element="chart" data-maliang-deck-chart-type="${el.chartType}"${ignoredOptionsAttr(el.options)}${ignoredSeriesAttr} style="${style}">`,
    renderChartBody(el),
    legendMarkup,
    `</figure>`,
  ].join('\n');
}
